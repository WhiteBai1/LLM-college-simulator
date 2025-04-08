from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain import chains
from langchain.memory import ConversationBufferWindowMemory
import re
import os
from dotenv import load_dotenv
import config
load_dotenv()

class npcSystem:
    def __init__(self): #npc设定
        self.npcs = [
            {
                "id": 1,
                "name": "小雅",
                "age":21,
                "gender":"女",
                "occupation":"学生",
                "personality":"体贴，温柔，耐心，独立，坚强",
                "likes":["动漫","音乐","美食"],
                "dislikes":["喝酒","抽烟"],
                "relationship": 0,
            }
        ]
        self.memory = {}     #空字典存放对话历史

    def get_npc(self,npc_id):
        for npc in self.npcs:
            if npc["id"] == npc_id:
                return npc

    def generate_memory(self,npc_id):          #生成对话历史
        if npc_id not in self.memory:
            self.memory[npc_id] = ConversationBufferWindowMemory(
                k=5,
                memory_key="chat_history",      #占位符变量名，要与下面的统一
                return_messages=True,
                input_key="player_input",       #输入，输出键变量名，与.save_content中一致
                output_key="npc_response",
            )
        return self.memory[npc_id]
    

class chatSystem:
    def __init__(self):
        self.llm = ChatOpenAI(              #调用大模型
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url="https://api.chatanywhere.tech/v1",
            model="gpt-3.5-turbo",
            temperature=0.7,
            max_tokens = 250
        )

    def create_chat_chain(self,npc,memory):
        prompt_template = ChatPromptTemplate.from_messages([            #提示词
            ("system", 
             f"""你是{npc['name']}，性格：{npc['personality']},年龄：{npc['age']}, 职业：{npc['occupation']}。
             当前对玩家的好感度：{npc['relationship']}(上限为100，下限为-100)
             好感度越高，与玩家交谈的语气越亲昵，反之则越冷淡。
             喜欢的主题：{", ".join(npc['likes'])}
             讨厌的话题：{", ".join(npc['dislikes'])}

            对话历史(这些是你与玩家最近5次的对话记录)
            {{chat_history}}                

             根据以下规则生成回应：
             1. 当玩家提及你喜欢的主题时，语气友好并增加好感度
             2. 遇到讨厌的话题时，冷淡回应并减少好感度
             3. 在回复末尾用[好感度+数字]或[好感度-数字]表示好感度变化
             4. 自然地引用对话历史，增加回应的多样性"""
             
            ),
            ("user", "{player_input}")                 #玩家输入
        ])
        def load_chat_history(input_dict):         #确保传给assign字典
                return {
                "chat_history": memory.load_memory_variables({})["chat_history"],       #变量名要一致
                "player_input": input_dict["player_input"],
            }

        return (
        RunnablePassthrough.assign(chat_history=load_chat_history)    #创建对话链
        |prompt_template
        |self.llm
        |StrOutputParser()
        )
    
    def create_ask_chain(self,npc,memory):
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", 
             f"""你是{npc['name']}，性格：{npc['personality']},年龄：{npc['age']}, 职业：{npc['occupation']}。
             当前对玩家的好感度：{npc['relationship']}(上限为100，下限为-100)
             好感度越高，与玩家交谈的语气越亲昵，反之则越冷淡。
             喜欢的主题：{", ".join(npc['likes'])}
             讨厌的话题：{", ".join(npc['dislikes'])}

            对话历史(这些是你与玩家最近5次的对话记录)
            {{chat_history}}

            根据以下的规则生成回应：
            1.玩家会给你一个关键词，但这实际上不是玩家自身提供的，你需要自然的提到关于这个关键词的话题，
            2.围绕这个关键词给玩家介绍一些小知识，
            3.在智力，情商，想象力这三个词中选择一个你认为与这次科普最相关的词，在对话末尾以[智力/情商/想象力]的形式给出。
            4.不要反复提及同样的知识。
            """),
            ("user", "{player_input}")])
        def load_chat_history(input_dict):         #确保传给assign字典
                return {
                "chat_history": memory.load_memory_variables({})["chat_history"],       #变量名要一致
                "player_input": input_dict["player_input"],
            }
        return (
        RunnablePassthrough.assign(chat_history=load_chat_history)    #创建对话链
        |prompt_template
        |self.llm
        |StrOutputParser()
        )
    

class RelationshipParser:
    @staticmethod
    def parse_response(response,npc_name):
        """从AI回复中解析好感度变化"""
        match = re.search(r'\[好感度([+-]\d+)\]', response)      #正则匹配
        if match:
            delta = int(match.group(1))
            # 移除标记保留纯文本
            clean_response = re.sub(r'\s*\[\+?-?\d+\]\s*', '', response)
            return {"response": clean_response, "delta": delta,}
        return {"response": response, "delta": 0,}  # 无变化时默认
    
    @staticmethod
    def clear_response(response):
        match = re.search(r'\[(.*?)\]', response)
        property = match.group(1)
        cleared_response = re.sub(r'\[(.*?)\]', '', response)
        if property:
            if property == "智力":
                return {"property":"intelligence","response":cleared_response}
            elif property == "情商":
                return {"property":"emotion","response":cleared_response}
            elif property == "想象力":
                return {"property":"imagination","response":cleared_response}
        else:
            return {"property":None,"response":cleared_response}
