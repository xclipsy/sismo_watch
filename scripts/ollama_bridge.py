#!/usr/bin/env python3
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [BRIDGE] %(message)s")
logger = logging.getLogger("ollama_bridge")

async def forward_stream(client_reader, client_writer):
    try:
        remote_reader, remote_writer = await asyncio.open_connection("127.0.0.1", 11434)
    except Exception as err:
        logger.error("Error conectando con Ollama local: %s", err)
        try:
            client_writer.close()
            await client_writer.wait_closed()
        except Exception:
            pass
        return

    async def pipe(src, dst, is_req: bool):
        try:
            while True:
                data = await src.read(16384)
                if not data:
                    break
                dst.write(data)
                await dst.drain()
        except Exception:
            pass
        finally:
            if is_req and dst.can_write_eof():
                try:
                    dst.write_eof()
                except Exception:
                    pass

    try:
        await asyncio.gather(
            pipe(client_reader, remote_writer, True),
            pipe(remote_reader, client_writer, False)
        )
    finally:
        for w in (client_writer, remote_writer):
            try:
                w.close()
                await w.wait_closed()
            except Exception:
                pass

async def start_bridge():
    server = await asyncio.start_server(forward_stream, "0.0.0.0", 11435)
    logger.info("Puente Ollama activo escuchando en 0.0.0.0:11435 -> 127.0.0.1:11434")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(start_bridge())
