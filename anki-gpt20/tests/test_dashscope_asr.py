"""
DashScope 音频转写 API 测试
测试异步音频转写功能
"""
import os
import sys
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 加载环境变量
load_dotenv()

# 从环境变量获取 API Key
api_key = os.getenv("DASHSCOPE_API_KEY")
if not api_key:
    raise ValueError("请设置 DASHSCOPE_API_KEY 环境变量（在 .env 文件中）")

# 测试用的文件 URL
file_urls = [
    "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav",
    "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_male2.wav",
]

language_hints = ["zh", "en"]


def submit_task(apikey: str, file_urls: list) -> str:
    """
    提交文件转写任务，包含待转写文件url列表
    
    Args:
        apikey: DashScope API Key
        file_urls: 待转写的文件 URL 列表
    
    Returns:
        任务 ID，如果失败返回 None
    """
    headers = {
        "Authorization": f"Bearer {apikey}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    
    data = {
        "model": "paraformer-v2",
        "input": {"file_urls": file_urls},
        "parameters": {
            "channel_id": [0],
            "language_hints": language_hints,
            # "vocabulary_id": "vocab-Xxxx",  # 可选：自定义词汇表ID
        },
    }
    
    # 录音文件转写服务url
    service_url = (
        "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription"
    )
    
    try:
        response = requests.post(
            service_url, headers=headers, data=json.dumps(data), timeout=30
        )
        
        # 打印响应内容
        if response.status_code == 200:
            result = response.json()
            task_id = result.get("output", {}).get("task_id")
            if task_id:
                print(f"✓ 任务提交成功，task_id: {task_id}")
                return task_id
            else:
                print("✗ 任务提交失败：响应中未找到 task_id")
                print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                return None
        else:
            print(f"✗ 任务提交失败，状态码: {response.status_code}")
            print(f"响应内容: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"✗ 请求异常: {e}")
        return None


def wait_for_complete(task_id: str, api_key: str, max_wait_time: int = 300) -> dict:
    """
    循环查询任务状态直到成功
    
    Args:
        task_id: 任务 ID
        api_key: DashScope API Key
        max_wait_time: 最大等待时间（秒），默认 300 秒
    
    Returns:
        转写结果，如果失败返回 None
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    
    pending = True
    start_time = time.time()
    poll_count = 0
    
    while pending:
        # 检查是否超时
        elapsed_time = time.time() - start_time
        if elapsed_time > max_wait_time:
            print(f"✗ 任务超时（超过 {max_wait_time} 秒）")
            return None
        
        poll_count += 1
        print(f"  查询任务状态 (第 {poll_count} 次)...")
        
        try:
            # 查询任务状态服务url
            service_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
            response = requests.post(service_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                status = result.get('output', {}).get('task_status')
                
                if status == 'SUCCEEDED':
                    print("✓ 任务完成！")
                    results = result.get('output', {}).get('results')
                    return results
                elif status == 'RUNNING' or status == 'PENDING':
                    print(f"  任务状态: {status}，继续等待...")
                else:
                    print(f"✗ 任务失败，状态: {status}")
                    print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                    pending = False
                    return None
            else:
                print(f"✗ 查询失败，状态码: {response.status_code}")
                print(f"响应内容: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
                pending = False
                return None
        except requests.exceptions.RequestException as e:
            print(f"✗ 请求异常: {e}")
            pending = False
            return None
        
        # 等待一段时间后再次查询
        time.sleep(2)  # 改为 2 秒，避免请求过于频繁


def download_transcription(transcription_url: str) -> dict:
    """
    下载并解析转写结果
    
    Args:
        transcription_url: 转写结果 URL
    
    Returns:
        解析后的 JSON 数据，如果失败返回 None
    """
    try:
        print(f"  下载转写结果: {transcription_url[:80]}...")
        response = requests.get(transcription_url, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  ✗ 下载失败，状态码: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"  ✗ 下载异常: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"  ✗ JSON 解析失败: {e}")
        return None


def format_transcription_result(transcription_data: dict) -> str:
    """
    格式化转写结果，便于阅读
    
    Args:
        transcription_data: 转写结果 JSON 数据
    
    Returns:
        格式化后的字符串
    """
    lines = []
    
    # 文件信息
    file_url = transcription_data.get("file_url", "未知")
    lines.append(f"文件: {file_url}")
    
    # 音频属性
    properties = transcription_data.get("properties", {})
    if properties:
        audio_format = properties.get("audio_format", "未知")
        channels = properties.get("channels", [])
        sampling_rate = properties.get("original_sampling_rate", "未知")
        duration_ms = properties.get("original_duration_in_milliseconds", "未知")
        duration_sec = duration_ms / 1000 if isinstance(duration_ms, (int, float)) else "未知"
        lines.append(f"格式: {audio_format}, 声道: {channels}, 采样率: {sampling_rate}Hz, 时长: {duration_sec}秒")
    
    lines.append("")
    
    # 转写内容
    transcripts = transcription_data.get("transcripts", [])
    for idx, transcript in enumerate(transcripts, 1):
        channel_id = transcript.get("channel_id", 0)
        content_duration = transcript.get("content_duration_in_milliseconds", 0)
        full_text = transcript.get("text", "")
        
        lines.append(f"【声道 {channel_id}】")
        lines.append(f"完整文本: {full_text}")
        lines.append(f"时长: {content_duration / 1000:.2f}秒")
        lines.append("")
        
        # 句子详情
        sentences = transcript.get("sentences", [])
        if sentences:
            lines.append("句子详情:")
            for sent_idx, sentence in enumerate(sentences, 1):
                sent_text = sentence.get("text", "")
                begin_time = sentence.get("begin_time", 0)
                end_time = sentence.get("end_time", 0)
                begin_sec = begin_time / 1000
                end_sec = end_time / 1000
                
                lines.append(f"  句子 {sent_idx}: [{begin_sec:.2f}s - {end_sec:.2f}s] {sent_text}")
                
                # 单词详情
                words = sentence.get("words", [])
                if words:
                    word_details = []
                    for word in words:
                        word_text = word.get("text", "")
                        word_begin = word.get("begin_time", 0) / 1000
                        word_end = word.get("end_time", 0) / 1000
                        punctuation = word.get("punctuation", "")
                        word_details.append(f"{word_text}({word_begin:.2f}s-{word_end:.2f}s){punctuation}")
                    lines.append(f"    单词: {' '.join(word_details)}")
            lines.append("")
    
    return "\n".join(lines)


def download_and_parse_results(results: list) -> list:
    """
    下载并解析所有转写结果
    
    Args:
        results: 任务结果列表，包含 transcription_url
    
    Returns:
        解析后的转写数据列表
    """
    parsed_results = []
    
    print("\n3. 下载并解析转写结果...")
    print("-" * 60)
    
    for idx, result_item in enumerate(results, 1):
        file_url = result_item.get("file_url", "未知")
        transcription_url = result_item.get("transcription_url")
        subtask_status = result_item.get("subtask_status", "未知")
        
        print(f"\n文件 {idx}: {file_url}")
        print(f"状态: {subtask_status}")
        
        if subtask_status == "SUCCEEDED" and transcription_url:
            transcription_data = download_transcription(transcription_url)
            if transcription_data:
                parsed_results.append({
                    "file_url": file_url,
                    "transcription_data": transcription_data
                })
                print("  ✓ 下载成功")
            else:
                print("  ✗ 下载失败")
        else:
            print(f"  ✗ 任务未成功完成，状态: {subtask_status}")
    
    return parsed_results


def test_dashscope_asr():
    """测试 DashScope 音频转写功能"""
    print("=" * 60)
    print("DashScope 音频转写 API 测试")
    print("=" * 60)
    print(f"API Key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else ''}")
    print(f"测试文件数量: {len(file_urls)}")
    print(f"语言提示: {language_hints}")
    print("-" * 60)
    
    # 提交任务
    print("\n1. 提交转写任务...")
    task_id = submit_task(apikey=api_key, file_urls=file_urls)
    
    if not task_id:
        print("\n✗ 测试失败：无法提交任务")
        return False
    
    print(f"\n2. 等待任务完成 (task_id: {task_id})...")
    result = wait_for_complete(task_id, api_key)
    
    if not result:
        print("\n✗ 测试失败：无法获取转写结果")
        return False
    
    # 下载并解析转写结果
    parsed_results = download_and_parse_results(result)
    
    if not parsed_results:
        print("\n✗ 测试失败：无法下载或解析转写结果")
        return False
    
    # 显示格式化后的转写结果
    print("\n" + "=" * 60)
    print("转写结果详情:")
    print("=" * 60)
    
    for idx, parsed_result in enumerate(parsed_results, 1):
        print(f"\n{'=' * 60}")
        print(f"结果 {idx}:")
        print("=" * 60)
        formatted = format_transcription_result(parsed_result["transcription_data"])
        print(formatted)
    
    # 同时保存原始 JSON 数据
    print("\n" + "=" * 60)
    print("原始 JSON 数据:")
    print("=" * 60)
    for idx, parsed_result in enumerate(parsed_results, 1):
        print(f"\n文件 {idx} 的完整 JSON:")
        print(json.dumps(parsed_result["transcription_data"], indent=2, ensure_ascii=False))
    
    print("\n" + "=" * 60)
    print("✓ 测试成功！")
    print("=" * 60)
    return True


if __name__ == "__main__":
    try:
        success = test_dashscope_asr()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

