# agents/scene_roles.py

from utils.llm import generate_llm_response

# 角色配置模板
ROLE_SCENES = {
    "teacher": {
        "role": "大学老师",
        "tone": "关心学生学习成长的口吻",
        "topic_hint": "大学生活相关的话题",
        "extra": "每个选项反映学生不同的行为倾向。"
    },
    "counselor": {
        "role": "大学辅导员",
        "tone": "温和理性的语气",
        "topic_hint": "大学适应、人际关系或生涯规划",
        "extra": ""
    },
    "senior": {
        "role": "学长",
        "tone": "轻松友好的语气",
        "topic_hint": "一个校园话题",
        "extra": "回答选项体现学习、社交、健康、决策等不同方向。"
    },
    "roommate": {
        "role": "宿舍舍友",
        "tone": "生活化、随意的语气",
        "topic_hint": "一个日常话题（如作息、娱乐、室友关系等）",
        "extra": ""
    }
}


def scene_start(role_key: str, desc: str):
    """
    通用的场景启动函数，根据角色模板生成 prompt。
    role_key 必须是 ROLE_SCENES 的键之一。
    """
    role_info = ROLE_SCENES.get(role_key)
    if not role_info:
        raise ValueError(f"未知的角色类型：{role_key}")

    prompt = f"""
你是一名{role_info['role']}，性格设定：{desc}
请以{role_info['tone']}，主动发起{role_info['topic_hint']}。
请提供4个不同方向的选择。{role_info['extra']}
格式如下：
主题：
选项：
A.
B.
C.
D.
"""
    return generate_llm_response(prompt)
