from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
from classes import npcSystem, chatSystem, RelationshipParser

app = FastAPI()
npc_system = npcSystem()
chat_system = chatSystem()

@app.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                raw_data = await websocket.receive_text()
                data = json.loads(raw_data)
                if data['type'] == 'player_input':
                    npc_id = data['npc_id']
                    npc = npc_system.get_npc(npc_id)
                    memory = npc_system.generate_memory(npc_id)


                    if data['method'] == 'talk':
                        chat_chain = chat_system.create_chat_chain(npc, memory)
                        response = chat_chain.invoke({"player_input": data['content']})         #传入玩家输入，生成对话回复
                        print(memory)
                        parsed_response = RelationshipParser.parse_response(response, npc['name'])
                        npc["relationship"] = max(-100, min(100, npc["relationship"] + parsed_response["delta"]))

                        memory.save_context(
                            {"player_input": data['content']},                      #键名与classes中的参数名一致
                            {"npc_response": parsed_response["response"]}
                        )

                        await websocket.send_json({
                            "type": "npc_response_talk",
                            "content": parsed_response["response"],
                            "delta": parsed_response["delta"],
                        })


                    if data['method'] == 'ask':
                        ask_chain = chat_system.create_ask_chain(npc, memory)
                        response = ask_chain.invoke({"player_input":data['keypoint']})
                        cleared_response = RelationshipParser.clear_response(response)
                        memory.save_context(
                            {"player_input": data['keypoint']},
                            {"npc_response": cleared_response["response"]}
                        )
                        
                        await websocket.send_json({
                            "type": "npc_response_ask",
                            "content": cleared_response['response'],
                            "property":cleared_response['property'],
                        })


            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
            except KeyError as e:
                await websocket.send_json({"error": f"Missing field: {e}"})
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        await websocket.close(code=1000, reason="Connection closed")