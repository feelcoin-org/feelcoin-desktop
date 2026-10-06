use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::time::Duration;

const LOCAL_DAEMON_HOST: &str = "127.0.0.1";
const LOCAL_DAEMON_RPC_PORT: u16 = 35781;
const LOCAL_WALLET_RPC_PORT: u16 = 35784;

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

fn open_local_stream(port: u16) -> Result<TcpStream, String> {
    let address = local_socket(port).ok_or_else(|| "Unable to resolve local service".to_string())?;
    let stream = TcpStream::connect_timeout(&address, Duration::from_millis(900))
        .map_err(|_| "Local service is not reachable".to_string())?;

    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;

    Ok(stream)
}

fn read_http_json(mut stream: TcpStream, request: &[u8]) -> Result<Value, String> {
    stream
        .write_all(request)
        .map_err(|error| format!("Unable to write local RPC request: {error}"))?;

    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|error| format!("Unable to read local RPC response: {error}"))?;

    let response = String::from_utf8(response)
        .map_err(|_| "Local RPC returned a non-UTF-8 response".to_string())?;
    let (headers, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| "Local RPC returned an invalid HTTP response".to_string())?;

    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return Err("Local RPC returned a non-success HTTP status".to_string());
    }

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

fn call_wallet_rpc(method: &str) -> Result<Value, String> {
    let payload = json!({
        "jsonrpc": "2.0",
        "id": "feelcoin-desktop",
        "method": method
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

    read_http_json(
        open_local_stream(LOCAL_WALLET_RPC_PORT)?,
        request.as_bytes(),
    )
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

#[tauri::command]
fn wallet_rpc_status() -> WalletRpcStatus {
    match call_wallet_rpc("get_version") {
        Ok(value) => WalletRpcStatus {
            reachable: value.get("error").is_none(),
            host: LOCAL_DAEMON_HOST.to_string(),
            port: LOCAL_WALLET_RPC_PORT,
            version: value
                .get("result")
                .and_then(|result| result.get("version"))
                .and_then(Value::as_u64),
            release: value
                .get("result")
                .and_then(|result| result.get("release"))
                .and_then(Value::as_bool),
            error: value
                .get("error")
                .map(|error| error.to_string())
                .filter(|error| !error.is_empty()),
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
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            network_defaults,
            daemon_info,
            wallet_rpc_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Feelcoin Desktop");
}
