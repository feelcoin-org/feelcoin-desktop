use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

const LOCAL_DAEMON_HOST: &str = "127.0.0.1";
const LOCAL_DAEMON_RPC_PORT: u16 = 35781;
const LOCAL_WALLET_RPC_PORT: u16 = 35784;

#[derive(Default)]
struct ProcessState {
    daemon: Mutex<Option<Child>>,
    wallet_rpc: Mutex<Option<Child>>,
}

#[derive(Serialize)]
struct NetworkDefaults {
    p2p_port: u16,
    daemon_rpc_port: u16,
    zmq_port: u16,
    wallet_rpc_port: u16,
}

#[derive(Debug, Default, Deserialize)]
struct GetInfoResponse {
    height: Option<u64>,
    target_height: Option<u64>,
    difficulty: Option<u64>,
    target: Option<u64>,
    incoming_connections_count: Option<u64>,
    outgoing_connections_count: Option<u64>,
    synchronized: Option<bool>,
    status: Option<String>,
    version: Option<String>,
}

#[derive(Serialize)]
struct DaemonInfo {
    reachable: bool,
    host: String,
    port: u16,
    height: Option<u64>,
    target_height: Option<u64>,
    difficulty: Option<u64>,
    target_seconds: Option<u64>,
    incoming_connections: Option<u64>,
    outgoing_connections: Option<u64>,
    synchronized: Option<bool>,
    status: Option<String>,
    version: Option<String>,
    error: Option<String>,
}

#[derive(Serialize)]
struct WalletRpcStatus {
    reachable: bool,
    host: String,
    port: u16,
    version: Option<u64>,
    release: Option<bool>,
    error: Option<String>,
}

#[derive(Serialize)]
struct LocalServiceStart {
    daemon_started: bool,
    wallet_rpc_started: bool,
    data_dir: String,
    wallet_dir: String,
}

#[derive(Serialize)]
struct WalletSummary {
    balance: u64,
    unlocked_balance: u64,
    address: String,
    height: u64,
}

#[derive(Serialize)]
struct SendResult {
    tx_hash: String,
    fee: u64,
    amount: u64,
}

#[tauri::command]
fn network_defaults() -> NetworkDefaults {
    NetworkDefaults {
        p2p_port: 35780,
        daemon_rpc_port: LOCAL_DAEMON_RPC_PORT,
        zmq_port: 35782,
        wallet_rpc_port: LOCAL_WALLET_RPC_PORT,
    }
}

fn local_socket(port: u16) -> Option<SocketAddr> {
    format!("{LOCAL_DAEMON_HOST}:{port}")
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next())
}

fn local_port_reachable(port: u16) -> bool {
    local_socket(port)
        .map(|address| TcpStream::connect_timeout(&address, Duration::from_millis(700)).is_ok())
        .unwrap_or(false)
}

fn open_local_stream(port: u16) -> Result<TcpStream, String> {
    let address =
        local_socket(port).ok_or_else(|| "Unable to resolve local service".to_string())?;
    let stream = TcpStream::connect_timeout(&address, Duration::from_millis(900))
        .map_err(|_| "Local service is not reachable".to_string())?;

    stream
        .set_read_timeout(Some(Duration::from_secs(3)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(3)))
        .map_err(|error| error.to_string())?;

    Ok(stream)
}

fn read_http_json(mut stream: TcpStream, request: &[u8]) -> Result<Value, String> {
    use std::io::{ErrorKind, Read, Write};

    stream
        .write_all(request)
        .map_err(|error| format!("Unable to write local RPC request: {error}"))?;

    // A single socket timeout must not abort a wallet operation.
    // create/open/restore/refresh can legitimately keep wallet-rpc busy.
    //
    // The socket timeout is therefore only a polling interval. The real
    // timeout is this overall deadline.
    const RPC_DEADLINE: Duration = Duration::from_secs(30);
    let deadline = Instant::now() + RPC_DEADLINE;

    let mut response = Vec::new();
    let mut buffer = [0u8; 8192];
    let mut header_end: Option<usize> = None;
    let mut content_length: Option<usize> = None;

    loop {
        if Instant::now() >= deadline {
            return Err(
                "Local RPC did not respond within 30 seconds. The wallet may still be refreshing."
                    .to_string(),
            );
        }

        match stream.read(&mut buffer) {
            Ok(0) => {
                // Peer closed the connection. This is valid only if we have
                // already received a complete response body.
                if let (Some(end), Some(length)) = (header_end, content_length) {
                    if response.len() >= end + length {
                        break;
                    }
                }

                if header_end.is_some() && content_length.is_none() {
                    break;
                }

                return Err(
                    "Local RPC closed the connection before the complete response was received"
                        .to_string(),
                );
            }

            Ok(count) => {
                response.extend_from_slice(&buffer[..count]);

                if header_end.is_none() {
                    if let Some(pos) = response.windows(4).position(|window| window == b"\r\n\r\n")
                    {
                        let end = pos + 4;
                        header_end = Some(end);

                        let headers = String::from_utf8_lossy(&response[..pos]);

                        for line in headers.lines() {
                            if let Some((name, value)) = line.split_once(':') {
                                if name.eq_ignore_ascii_case("content-length") {
                                    content_length = value.trim().parse::<usize>().ok();
                                }
                            }
                        }
                    }
                }

                if let (Some(end), Some(length)) = (header_end, content_length) {
                    if response.len() >= end + length {
                        break;
                    }
                }
            }

            Err(error) if error.kind() == ErrorKind::Interrupted => {
                continue;
            }

            Err(error) if matches!(error.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => {
                // Linux may report the socket timeout as EAGAIN/WouldBlock.
                // This is not an RPC failure. Keep waiting until our overall
                // deadline expires.
                continue;
            }

            Err(error) => {
                return Err(format!("Unable to read local RPC response: {error}"));
            }
        }
    }

    let header_end =
        header_end.ok_or_else(|| "Local RPC returned an invalid HTTP response".to_string())?;

    let headers = String::from_utf8_lossy(&response[..header_end]);

    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return Err("Local RPC returned a non-success HTTP status".to_string());
    }

    let body_end = match content_length {
        Some(length) => header_end
            .checked_add(length)
            .ok_or_else(|| "Local RPC response length overflow".to_string())?,
        None => response.len(),
    };

    if response.len() < body_end {
        return Err("Local RPC response ended before the complete body was received".to_string());
    }

    let body = std::str::from_utf8(&response[header_end..body_end])
        .map_err(|_| "Local RPC returned a non-UTF-8 response body".to_string())?;

    serde_json::from_str(body).map_err(|error| format!("Unable to parse local RPC JSON: {error}"))
}

fn fetch_local_daemon_info() -> Result<GetInfoResponse, String> {
    let stream = open_local_stream(LOCAL_DAEMON_RPC_PORT)?;
    let request = concat!(
        "GET /get_info HTTP/1.1\r\n",
        "Host: 127.0.0.1:35781\r\n",
        "Accept: application/json\r\n",
        "Connection: close\r\n",
        "\r\n"
    );

    let value = read_http_json(stream, request.as_bytes())?;
    serde_json::from_value(value)
        .map_err(|error| format!("Unable to decode daemon information: {error}"))
}

fn call_wallet_rpc_with_params(method: &str, params: Value) -> Result<Value, String> {
    let payload = json!({
        "jsonrpc": "2.0",
        "id": "feelcoin-desktop",
        "method": method,
        "params": params
    })
    .to_string();

    let request = format!(
        concat!(
            "POST /json_rpc HTTP/1.1\r\n",
            "Host: 127.0.0.1:35784\r\n",
            "Content-Type: application/json\r\n",
            "Accept: application/json\r\n",
            "Content-Length: {}\r\n",
            "Connection: close\r\n",
            "\r\n",
            "{}"
        ),
        payload.len(),
        payload
    );

    let value = read_http_json(
        open_local_stream(LOCAL_WALLET_RPC_PORT)?,
        request.as_bytes(),
    )?;

    if let Some(error) = value.get("error") {
        let message = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("Wallet RPC request failed");
        return Err(message.to_string());
    }

    Ok(value.get("result").cloned().unwrap_or(Value::Null))
}

fn call_wallet_rpc(method: &str) -> Result<Value, String> {
    call_wallet_rpc_with_params(method, json!({}))
}

fn binary_name(base: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{base}.exe")
    } else {
        base.to_string()
    }
}

fn resolve_bundled_binary(app: &tauri::AppHandle, base: &str) -> Result<PathBuf, String> {
    let name = binary_name(base);
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Unable to locate Feelcoin resources: {error}"))?;

    let mut candidates = vec![
        resource_dir.join("resources").join("bin").join(&name),
        resource_dir.join("bin").join(&name),
    ];

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            candidates.push(parent.join(&name));
            candidates.push(parent.join("resources").join("bin").join(&name));
        }
    }

    candidates
        .into_iter()
        .find(|path| path.is_file())
        .ok_or_else(|| format!("Bundled Feelcoin component not found: {name}"))
}

fn apply_bundled_library_path(
    command: &mut Command,
    app: &tauri::AppHandle,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let resource_dir = app
            .path()
            .resource_dir()
            .map_err(|error| format!("Unable to locate Feelcoin resources: {error}"))?;

        let bundled_lib_dir = resource_dir
            .join("resources")
            .join("lib");

        if bundled_lib_dir.is_dir() {
            let inherited = std::env::var("LD_LIBRARY_PATH")
                .unwrap_or_default();

            let value = if inherited.is_empty() {
                bundled_lib_dir.to_string_lossy().into_owned()
            } else {
                format!(
                    "{}:{}",
                    bundled_lib_dir.to_string_lossy(),
                    inherited
                )
            };

            command.env("LD_LIBRARY_PATH", value);
        }
    }

    Ok(())
}


fn ensure_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path)
        .map_err(|error| format!("Unable to create {}: {error}", path.display()))
}

fn child_is_running(child: &mut Option<Child>) -> bool {
    match child {
        Some(process) => match process.try_wait() {
            Ok(None) => true,
            Ok(Some(_)) | Err(_) => {
                *child = None;
                false
            }
        },
        None => false,
    }
}

#[tauri::command]
fn start_local_services(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProcessState>,
) -> Result<LocalServiceStart, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate application data directory: {error}"))?;
    let blockchain_dir = app_data.join("blockchain");
    let wallet_dir = app_data.join("wallets");
    let log_dir = app_data.join("logs");

    ensure_directory(&blockchain_dir)?;
    ensure_directory(&wallet_dir)?;
    ensure_directory(&log_dir)?;

    let mut daemon_started = false;
    let mut wallet_rpc_started = false;

    if !local_port_reachable(LOCAL_DAEMON_RPC_PORT) {
        let mut daemon_guard = state
            .daemon
            .lock()
            .map_err(|_| "Unable to access daemon process state".to_string())?;

        if !child_is_running(&mut daemon_guard) {
            let daemon_binary = resolve_bundled_binary(&app, "feelcoind")?;
            let daemon_log = log_dir.join("feelcoind.log");

            let mut daemon_command = Command::new(daemon_binary);

            apply_bundled_library_path(
                &mut daemon_command,
                &app,
            )?;

            let child = daemon_command
                .arg("--data-dir")
                .arg(&blockchain_dir)
                .arg("--p2p-bind-port")
                .arg("35780")
                .arg("--rpc-bind-ip")
                .arg(LOCAL_DAEMON_HOST)
                .arg("--rpc-bind-port")
                .arg(LOCAL_DAEMON_RPC_PORT.to_string())
                .arg("--log-file")
                .arg(daemon_log)
                .arg("--non-interactive")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|error| format!("Unable to start Feelcoin daemon: {error}"))?;

            *daemon_guard = Some(child);
            daemon_started = true;
        }
    }

    if !local_port_reachable(LOCAL_WALLET_RPC_PORT) {
        let mut wallet_guard = state
            .wallet_rpc
            .lock()
            .map_err(|_| "Unable to access wallet RPC process state".to_string())?;

        if !child_is_running(&mut wallet_guard) {
            let wallet_binary = resolve_bundled_binary(&app, "feelcoin-wallet-rpc")?;
            let wallet_log = log_dir.join("wallet-rpc.log");

            let mut wallet_command = Command::new(wallet_binary);

            apply_bundled_library_path(
                &mut wallet_command,
                &app,
            )?;

            let child = wallet_command
                .arg("--wallet-dir")
                .arg(&wallet_dir)
                .arg("--daemon-address")
                .arg("127.0.0.1:35781")
                .arg("--rpc-bind-ip")
                .arg(LOCAL_DAEMON_HOST)
                .arg("--rpc-bind-port")
                .arg(LOCAL_WALLET_RPC_PORT.to_string())
                .arg("--disable-rpc-login")
                .arg("--log-file")
                .arg(wallet_log)
                .arg("--non-interactive")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|error| format!("Unable to start Feelcoin wallet RPC: {error}"))?;

            *wallet_guard = Some(child);
            wallet_rpc_started = true;
        }
    }

    Ok(LocalServiceStart {
        daemon_started,
        wallet_rpc_started,
        data_dir: blockchain_dir.to_string_lossy().into_owned(),
        wallet_dir: wallet_dir.to_string_lossy().into_owned(),
    })
}

fn stop_child(child: &Mutex<Option<Child>>) {
    if let Ok(mut guard) = child.lock() {
        if let Some(process) = guard.as_mut() {
            let _ = process.kill();
            let _ = process.wait();
        }
        *guard = None;
    }
}

#[tauri::command]
fn stop_local_services(state: tauri::State<'_, ProcessState>) {
    stop_child(&state.wallet_rpc);
    stop_child(&state.daemon);
}

#[tauri::command]
fn restart_local_services(
    app: tauri::AppHandle,
    state: tauri::State<'_, ProcessState>,
) -> Result<LocalServiceStart, String> {
    // Wallet RPC first because it depends on the daemon.
    stop_child(&state.wallet_rpc);
    stop_child(&state.daemon);

    // Give the OS a short moment to release the RPC listeners.
    std::thread::sleep(Duration::from_millis(500));

    start_local_services(app, state)
}

#[tauri::command]
fn daemon_info() -> DaemonInfo {
    match fetch_local_daemon_info() {
        Ok(info) => DaemonInfo {
            reachable: true,
            host: LOCAL_DAEMON_HOST.to_string(),
            port: LOCAL_DAEMON_RPC_PORT,
            height: info.height,
            target_height: info.target_height,
            difficulty: info.difficulty,
            target_seconds: info.target,
            incoming_connections: info.incoming_connections_count,
            outgoing_connections: info.outgoing_connections_count,
            synchronized: info.synchronized,
            status: info.status,
            version: info.version,
            error: None,
        },
        Err(error) => DaemonInfo {
            reachable: false,
            host: LOCAL_DAEMON_HOST.to_string(),
            port: LOCAL_DAEMON_RPC_PORT,
            height: None,
            target_height: None,
            difficulty: None,
            target_seconds: None,
            incoming_connections: None,
            outgoing_connections: None,
            synchronized: None,
            status: None,
            version: None,
            error: Some(error),
        },
    }
}

fn validate_wallet_name(filename: &str) -> Result<(), String> {
    if filename.is_empty() || filename.len() > 64 {
        return Err("Wallet name must contain between 1 and 64 characters".to_string());
    }

    if filename == "." || filename == ".." {
        return Err("Invalid wallet name".to_string());
    }

    if !filename
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.'))
    {
        return Err(
            "Wallet name may only contain letters, numbers, dots, hyphens and underscores"
                .to_string(),
        );
    }

    Ok(())
}

#[derive(Serialize)]
struct WalletRecoveryInfo {
    mnemonic: String,
    private_view_key: String,
    private_spend_key: String,
}

fn query_wallet_key(key_type: &str) -> Result<String, String> {
    let result = call_wallet_rpc_with_params(
        "query_key",
        json!({
            "key_type": key_type
        }),
    )?;

    result
        .get("key")
        .and_then(Value::as_str)
        .filter(|key| !key.is_empty())
        .map(str::to_owned)
        .ok_or_else(|| format!("Wallet RPC did not return {key_type}"))
}

#[tauri::command]
fn create_wallet(filename: String, password: String) -> Result<WalletRecoveryInfo, String> {
    validate_wallet_name(&filename)?;
    call_wallet_rpc_with_params(
        "create_wallet",
        json!({
            "filename": filename,
            "password": password,
            "language": "English"
        }),
    )?;

    let mnemonic = query_wallet_key("mnemonic")?;
    let private_view_key = query_wallet_key("view_key")?;
    let private_spend_key = query_wallet_key("spend_key")?;

    Ok(WalletRecoveryInfo {
        mnemonic,
        private_view_key,
        private_spend_key,
    })
}

#[tauri::command]
fn open_wallet(filename: String, password: String) -> Result<(), String> {
    validate_wallet_name(&filename)?;
    call_wallet_rpc_with_params(
        "open_wallet",
        json!({
            "filename": filename,
            "password": password
        }),
    )?;
    Ok(())
}

#[tauri::command]
fn restore_wallet(
    filename: String,
    password: String,
    seed: String,
    restore_height: Option<u64>,
) -> Result<(), String> {
    validate_wallet_name(&filename)?;

    if seed.split_whitespace().count() < 12 {
        return Err("Recovery seed appears incomplete".to_string());
    }

    call_wallet_rpc_with_params(
        "restore_deterministic_wallet",
        json!({
            "restore_height": restore_height.unwrap_or(0),
            "filename": filename,
            "seed": seed,
            "seed_offset": "",
            "password": password,
            "language": "English",
            "autosave_current": true
        }),
    )?;
    Ok(())
}

#[tauri::command]
fn close_wallet() -> Result<(), String> {
    call_wallet_rpc_with_params("close_wallet", json!({"autosave_current": true}))?;
    Ok(())
}

#[tauri::command]
fn wallet_summary() -> Result<WalletSummary, String> {
    let balance = call_wallet_rpc_with_params("get_balance", json!({"account_index": 0}))?;
    let address = call_wallet_rpc_with_params("get_address", json!({"account_index": 0}))?;
    let height = call_wallet_rpc("get_height")?;

    Ok(WalletSummary {
        balance: balance.get("balance").and_then(Value::as_u64).unwrap_or(0),
        unlocked_balance: balance
            .get("unlocked_balance")
            .and_then(Value::as_u64)
            .unwrap_or(0),
        address: address
            .get("address")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        height: height.get("height").and_then(Value::as_u64).unwrap_or(0),
    })
}

#[tauri::command]
fn send_feel(address: String, amount_atomic: String) -> Result<SendResult, String> {
    if address.trim().is_empty() {
        return Err("Destination address is required".to_string());
    }

    let amount = amount_atomic
        .parse::<u64>()
        .map_err(|_| "Invalid amount".to_string())?;

    if amount == 0 {
        return Err("Amount must be greater than zero".to_string());
    }

    let result = call_wallet_rpc_with_params(
        "transfer",
        json!({
            "destinations": [{
                "amount": amount,
                "address": address
            }],
            "account_index": 0,
            "priority": 0,
            "get_tx_key": true
        }),
    )?;

    Ok(SendResult {
        tx_hash: result
            .get("tx_hash")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        fee: result.get("fee").and_then(Value::as_u64).unwrap_or(0),
        amount,
    })
}

#[tauri::command]
fn transaction_history() -> Result<Value, String> {
    call_wallet_rpc_with_params(
        "get_transfers",
        json!({
            "in": true,
            "out": true,
            "pending": true,
            "failed": true,
            "pool": true,
            "account_index": 0
        }),
    )
}

#[tauri::command]
fn wallet_rpc_status() -> WalletRpcStatus {
    match call_wallet_rpc("get_version") {
        Ok(result) => WalletRpcStatus {
            reachable: true,
            host: LOCAL_DAEMON_HOST.to_string(),
            port: LOCAL_WALLET_RPC_PORT,
            version: result.get("version").and_then(Value::as_u64),
            release: result.get("release").and_then(Value::as_bool),
            error: None,
        },
        Err(error) => WalletRpcStatus {
            reachable: false,
            host: LOCAL_DAEMON_HOST.to_string(),
            port: LOCAL_WALLET_RPC_PORT,
            version: None,
            release: None,
            error: Some(error),
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(ProcessState::default())
        .invoke_handler(tauri::generate_handler![
            network_defaults,
            start_local_services,
            stop_local_services,
            restart_local_services,
            daemon_info,
            wallet_rpc_status,
            create_wallet,
            open_wallet,
            restore_wallet,
            close_wallet,
            wallet_summary,
            send_feel,
            transaction_history
        ])
        .build(tauri::generate_context!())
        .expect("error while building Feelcoin Desktop");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            let state = app_handle.state::<ProcessState>();
            stop_child(&state.wallet_rpc);
            stop_child(&state.daemon);
        }
    });
}
