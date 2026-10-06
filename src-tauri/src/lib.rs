use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const LOCAL_DAEMON_HOST: &str = "127.0.0.1";
const LOCAL_DAEMON_RPC_PORT: u16 = 35781;

#[derive(Serialize)]
struct NetworkDefaults {
    p2p_port: u16,
    daemon_rpc_port: u16,
    zmq_port: u16,
    wallet_rpc_port: u16,
}

#[derive(Serialize)]
struct RpcStatus {
    reachable: bool,
    host: String,
    port: u16,
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

#[tauri::command]
fn network_defaults() -> NetworkDefaults {
    NetworkDefaults {
        p2p_port: 35780,
        daemon_rpc_port: LOCAL_DAEMON_RPC_PORT,
        zmq_port: 35782,
        wallet_rpc_port: 35784,
    }
}

fn local_daemon_socket() -> Option<std::net::SocketAddr> {
    format!("{LOCAL_DAEMON_HOST}:{LOCAL_DAEMON_RPC_PORT}")
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next())
}

fn local_daemon_reachable() -> bool {
    local_daemon_socket()
        .map(|address| {
            TcpStream::connect_timeout(&address, Duration::from_millis(700)).is_ok()
        })
        .unwrap_or(false)
}

#[tauri::command]
fn check_daemon_rpc() -> RpcStatus {
    RpcStatus {
        reachable: local_daemon_reachable(),
        host: LOCAL_DAEMON_HOST.to_string(),
        port: LOCAL_DAEMON_RPC_PORT,
    }
}

fn fetch_local_daemon_info() -> Result<GetInfoResponse, String> {
    let address = local_daemon_socket().ok_or_else(|| "Unable to resolve local daemon".to_string())?;
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(900))
        .map_err(|_| "Local Feelcoin daemon is not reachable".to_string())?;

    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;

    let request = concat!(
        "GET /get_info HTTP/1.1\r\n",
        "Host: 127.0.0.1:35781\r\n",
        "Accept: application/json\r\n",
        "Connection: close\r\n",
        "\r\n"
    );

    stream
        .write_all(request.as_bytes())
        .map_err(|error| format!("Unable to query local daemon: {error}"))?;

    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|error| format!("Unable to read local daemon response: {error}"))?;

    let response = String::from_utf8(response)
        .map_err(|_| "Local daemon returned a non-UTF-8 response".to_string())?;
    let (headers, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| "Local daemon returned an invalid HTTP response".to_string())?;

    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return Err("Local daemon returned a non-success HTTP status".to_string());
    }

    serde_json::from_str(body)
        .map_err(|error| format!("Unable to parse local daemon information: {error}"))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            network_defaults,
            check_daemon_rpc,
            daemon_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running Feelcoin Desktop");
}
