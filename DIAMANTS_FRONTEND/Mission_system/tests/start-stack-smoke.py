"""Integration checks against an already-running local Ollama (no model inference)."""
import os
from pathlib import Path
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request

launcher = Path(__file__).resolve().parents[3] / 'start.sh'

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept':'*/*'}), timeout=2) as response:
        return response.read()

def wait_http(url):
    last_error = None
    for _ in range(100):
        try:
            return get(url)
        except OSError as error:
            last_error = error
            time.sleep(.1)
    raise AssertionError(f'Service unavailable: {url}: {last_error}')

assert b'models' in get('http://127.0.0.1:11434/api/tags')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
url = f'http://127.0.0.1:{port}/'
env = {**os.environ, 'PORT': str(port)}
with tempfile.TemporaryFile(mode='w+') as log:
    process = subprocess.Popen([str(launcher)], cwd='/private/tmp', env=env, stdout=log, stderr=log)
    try:
        assert b'Command Center' in wait_http(url)
        assert get(url+'intelligence/model-providers/agent-models.json').strip() == b'{}'
        conflict = subprocess.run([str(launcher)], env=env, capture_output=True, text=True, timeout=10)
        assert conflict.returncode == 1 and 'indisponible' in conflict.stderr
        process.send_signal(signal.SIGINT)
        assert process.wait(timeout=10) == 0
        with socket.socket() as probe:
            assert probe.connect_ex(('127.0.0.1', port)) != 0, 'Frontend leaked after shutdown'
        assert b'models' in get('http://127.0.0.1:11434/api/tags'), 'Existing backend must survive'
        log.seek(0)
        assert 'existant réutilisé' in log.read()
    except Exception:
        log.seek(0)
        print(log.read())
        raise
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
invalid = subprocess.run([str(launcher)], env={**env, 'PORT':'invalid'}, capture_output=True, text=True)
assert invalid.returncode == 1 and 'PORT' in invalid.stderr
print('PASS: start from another directory, backend reuse, HTTP frontend, empty model registry, occupied port, invalid port, SIGINT cleanup, existing backend preserved')
