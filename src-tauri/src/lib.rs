use serde::Serialize;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

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

#[tauri::command]
fn network_defaults() -> NetworkDefaults {
    NetworkDefaults {
        p2p_port: 35780,
        daemon_rpc_port: 35781,
        zmq_port: 35782,
        wallet_rpc_port: 35784,
    }
}

#[tauri::command]
fn check_daemon_rpc(host: String, port: u16) -> RpcStatus {
    let endpoint = format!("{host}:{port}");
    let reachable = endpoint
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| {
            addresses.any(|address| {
                TcpStream::connect_timeout(&address, Duration::from_millis(700)).is_ok()
            })
            .then_some(true)
        })
        .unwrap_or(false);

    RpcStatus {
        reachable,
        host,
        port,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![network_defaults, check_daemon_rpc])
        .run(tauri::generate_context!())
        .expect("error while running Feelcoin Desktop");
}
