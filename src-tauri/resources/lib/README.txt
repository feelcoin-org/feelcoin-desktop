This directory contains platform-specific runtime libraries bundled with Feelcoin Desktop.

Linux packages include libcom_err.so.2 here. The Windows CI removes Linux .so files before packaging, so this text file intentionally remains to keep the Tauri resources/lib/* glob valid on Windows.
