"""
DashScope 音频转写完整流程测试
整合文件上传和 ASR 转写功能：
1. 上传本地音频文件到 OSS（获取 oss:// 格式的临时 URL）
2. 使用上传后的 oss:// URL 进行 ASR 转写（RESTful API 支持 oss:// 格式）
3. 下载并解析转写结果

注意：
- 使用 RESTful API 时，支持使用 oss:// 前缀的临时 URL
- 临时 URL 有效期 48 小时，过期后无法使用
- 文件上传凭证接口限流为 100 QPS，请勿用于生产环境
- 支持的语言：zh(中文), en(英文), ja(日语), yue(粤语), ko(韩语), de(德语), fr(法语), ru(俄语)
- 默认语言设置为日语 (ja)
"""
import os
import sys
import json
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta
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

# ASR 转写使用的语言提示（默认：日语）
# 支持的语言代码：zh(中文), en(英文), ja(日语), yue(粤语), ko(韩语), de(德语), fr(法语), ru(俄语)
language_hints = ["ja"]


# ==================== 文件上传功能 ====================

def get_upload_policy(api_key: str, model_name: str) -> dict:
    """
    获取文件上传凭证
    
    Args:
        api_key: DashScope API Key
        model_name: 模型名称（用于 ASR 上传，通常使用 "paraformer-v2"）
    
    Returns:
        上传凭证数据
    """
    url = "https://dashscope.aliyuncs.com/api/v1/uploads"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    params = {
        "action": "getPolicy",
        "model": model_name
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        if response.status_code != 200:
            raise Exception(f"获取上传凭证失败: {response.text}")
        return response.json()['data']
    except requests.exceptions.RequestException as e:
        raise Exception(f"请求异常: {e}")


def upload_file_to_oss(policy_data: dict, file_path: str) -> str:
    """
    将文件上传到临时存储 OSS
    
    Args:
        policy_data: 上传凭证数据
        file_path: 本地文件路径
    
    Returns:
        OSS URL (oss:// 格式)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    file_name = Path(file_path).name
    key = f"{policy_data['upload_dir']}/{file_name}"

    try:
        with open(file_path, 'rb') as file:
            files = {
                'OSSAccessKeyId': (None, policy_data['oss_access_key_id']),
                'Signature': (None, policy_data['signature']),
                'policy': (None, policy_data['policy']),
                'x-oss-object-acl': (None, policy_data['x_oss_object_acl']),
                'x-oss-forbid-overwrite': (None, policy_data['x_oss_forbid_overwrite']),
                'key': (None, key),
                'success_action_status': (None, '200'),
                'file': (file_name, file)
            }

            response = requests.post(policy_data['upload_host'], files=files, timeout=300)
            if response.status_code != 200:
                raise Exception(f"文件上传失败: {response.text}")

        return f"oss://{key}"
    except requests.exceptions.RequestException as e:
        raise Exception(f"上传请求异常: {e}")


def upload_file_and_get_url(api_key: str, model_name: str, file_path: str) -> str:
    """
    上传文件并获取 URL
    
    Args:
        api_key: DashScope API Key
        model_name: 模型名称
        file_path: 本地文件路径
    
    Returns:
        OSS URL (oss:// 格式)
    """
    print(f"  1.1 获取上传凭证 (model: {model_name})...")
    policy_data = get_upload_policy(api_key, model_name)
    print(f"  1.2 上传文件到 OSS: {file_path}...")
    oss_url = upload_file_to_oss(policy_data, file_path)
    print(f"  ✓ 文件上传成功: {oss_url}")
    return oss_url


# ==================== ASR 转写功能 ====================

def submit_asr_task(apikey: str, file_urls: list, language_hints: list = None) -> str:
    """
    提交文件转写任务
    
    注意：
    - 使用 RESTful API 时，支持使用 oss:// 前缀的临时 URL
    - 临时 URL 有效期 48 小时，过期后无法使用
    - 输入源需为可通过公网访问的文件 URL（支持 HTTP/HTTPS 协议或 oss:// 格式）
    - 单次请求最多支持 100 个 URL
    
    Args:
        apikey: DashScope API Key
        file_urls: 待转写的文件 URL 列表（支持 oss:// 或 http:///https:// 格式）
        language_hints: 语言提示列表，默认为 ["ja"]（日语）
                      支持：zh(中文), en(英文), ja(日语), yue(粤语), ko(韩语), de(德语), fr(法语), ru(俄语)
    
    Returns:
        任务 ID，如果失败返回 None
    """
    if language_hints is None:
        language_hints = ["ja"]
    
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
        },
    }
    
    service_url = "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription"
    
    try:
        response = requests.post(
            service_url, headers=headers, data=json.dumps(data), timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            task_id = result.get("output", {}).get("task_id")
            if task_id:
                print(f"  ✓ ASR 任务提交成功，task_id: {task_id}")
                return task_id
            else:
                print("  ✗ ASR 任务提交失败：响应中未找到 task_id")
                print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                return None
        else:
            print(f"  ✗ ASR 任务提交失败，状态码: {response.status_code}")
            print(f"响应内容: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"  ✗ 请求异常: {e}")
        return None


def wait_for_asr_complete(task_id: str, api_key: str, max_wait_time: int = 300) -> list:
    """
    循环查询 ASR 任务状态直到成功
    
    Args:
        task_id: 任务 ID
        api_key: DashScope API Key
        max_wait_time: 最大等待时间（秒），默认 300 秒
    
    Returns:
        转写结果列表，如果失败返回 None
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
        elapsed_time = time.time() - start_time
        if elapsed_time > max_wait_time:
            print(f"  ✗ 任务超时（超过 {max_wait_time} 秒）")
            return None
        
        poll_count += 1
        print(f"  3.{poll_count} 查询任务状态...")
        
        try:
            service_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
            response = requests.post(service_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                status = result.get('output', {}).get('task_status')
                
                if status == 'SUCCEEDED':
                    print("  ✓ ASR 任务完成！")
                    results = result.get('output', {}).get('results')
                    return results
                elif status == 'RUNNING' or status == 'PENDING':
                    print(f"  任务状态: {status}，继续等待...")
                else:
                    print(f"  ✗ 任务失败，状态: {status}")
                    print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                    pending = False
                    return None
            else:
                print(f"  ✗ 查询失败，状态码: {response.status_code}")
                print(f"响应内容: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
                pending = False
                return None
        except requests.exceptions.RequestException as e:
            print(f"  ✗ 请求异常: {e}")
            pending = False
            return None
        
        time.sleep(2)


def download_transcription(transcription_url: str) -> dict:
    """
    下载并解析转写结果
    
    Args:
        transcription_url: 转写结果 URL
    
    Returns:
        解析后的 JSON 数据，如果失败返回 None
    """
    try:
        print(f"    下载转写结果: {transcription_url[:80]}...")
        response = requests.get(transcription_url, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"    ✗ 下载失败，状态码: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"    ✗ 下载异常: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"    ✗ JSON 解析失败: {e}")
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
    
    file_url = transcription_data.get("file_url", "未知")
    lines.append(f"文件: {file_url}")
    
    properties = transcription_data.get("properties", {})
    if properties:
        audio_format = properties.get("audio_format", "未知")
        channels = properties.get("channels", [])
        sampling_rate = properties.get("original_sampling_rate", "未知")
        duration_ms = properties.get("original_duration_in_milliseconds", "未知")
        duration_sec = duration_ms / 1000 if isinstance(duration_ms, (int, float)) else "未知"
        lines.append(f"格式: {audio_format}, 声道: {channels}, 采样率: {sampling_rate}Hz, 时长: {duration_sec}秒")
    
    lines.append("")
    
    transcripts = transcription_data.get("transcripts", [])
    for idx, transcript in enumerate(transcripts, 1):
        channel_id = transcript.get("channel_id", 0)
        content_duration = transcript.get("content_duration_in_milliseconds", 0)
        full_text = transcript.get("text", "")
        
        lines.append(f"【声道 {channel_id}】")
        lines.append(f"完整文本: {full_text}")
        lines.append(f"时长: {content_duration / 1000:.2f}秒")
        lines.append("")
        
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
    
    print("\n4. 下载并解析转写结果...")
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
                print("    ✓ 下载成功")
            else:
                print("    ✗ 下载失败")
        else:
            print(f"    ✗ 任务未成功完成，状态: {subtask_status}")
    
    return parsed_results


# ==================== 主测试函数 ====================

def test_asr_with_upload(file_paths: list, model_name: str = "paraformer-v2", language_hints: list = None):
    """
    完整的 ASR 转写流程测试：上传文件 -> 转写 -> 解析结果
    
    注意：
    - 上传后的 URL 为 oss:// 格式，RESTful API 支持直接使用
    - 临时 URL 有效期 48 小时
    - 文件上传凭证接口限流为 100 QPS，请勿用于生产环境
    
    Args:
        file_paths: 本地文件路径列表
        model_name: 上传时使用的模型名称（用于获取上传凭证，默认 "paraformer-v2"）
        language_hints: 语言提示列表，默认为 ["ja"]（日语）
                      支持：zh(中文), en(英文), ja(日语), yue(粤语), ko(韩语), de(德语), fr(法语), ru(俄语)
    
    Returns:
        是否成功
    """
    if language_hints is None:
        language_hints = ["ja"]
    
    print("=" * 60)
    print("DashScope 音频转写完整流程测试")
    print("=" * 60)
    print(f"API Key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else ''}")
    print(f"本地文件数量: {len(file_paths)}")
    print(f"语言提示: {language_hints}")
    print("-" * 60)
    
    # 步骤 1: 上传文件
    print("\n1. 上传本地文件到 OSS...")
    uploaded_urls = []
    
    for idx, file_path in enumerate(file_paths, 1):
        print(f"\n文件 {idx}: {file_path}")
        try:
            oss_url = upload_file_and_get_url(api_key, model_name, file_path)
            uploaded_urls.append(oss_url)
            
            # 显示文件信息
            file_size = os.path.getsize(file_path) / 1024 / 1024  # MB
            expire_time = datetime.now() + timedelta(hours=48)
            print(f"  文件大小: {file_size:.2f} MB")
            print(f"  URL 有效期: 48小时（过期时间: {expire_time.strftime('%Y-%m-%d %H:%M:%S')}）")
        except Exception as e:
            print(f"  ✗ 上传失败: {e}")
            return False
    
    if not uploaded_urls:
        print("\n✗ 没有成功上传任何文件")
        return False
    
    # 步骤 2: 提交 ASR 转写任务
    print(f"\n2. 提交 ASR 转写任务（使用 {len(uploaded_urls)} 个文件）...")
    task_id = submit_asr_task(api_key, uploaded_urls, language_hints)
    
    if not task_id:
        print("\n✗ 测试失败：无法提交 ASR 任务")
        return False
    
    # 步骤 3: 等待任务完成
    print(f"\n3. 等待 ASR 任务完成 (task_id: {task_id})...")
    result = wait_for_asr_complete(task_id, api_key)
    
    if not result:
        print("\n✗ 测试失败：无法获取转写结果")
        return False
    
    # 步骤 4: 下载并解析转写结果
    parsed_results = download_and_parse_results(result)
    
    if not parsed_results:
        print("\n✗ 测试失败：无法下载或解析转写结果")
        return False
    
    # 步骤 5: 显示结果
    print("\n" + "=" * 60)
    print("转写结果详情:")
    print("=" * 60)
    
    for idx, parsed_result in enumerate(parsed_results, 1):
        print(f"\n{'=' * 60}")
        print(f"结果 {idx}:")
        print("=" * 60)
        formatted = format_transcription_result(parsed_result["transcription_data"])
        print(formatted)
    
    # 显示原始 JSON 数据
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
    # 示例：使用 tests 目录下的音频文件
    test_files = [
        "tests/MP3_01.mp3",  # 如果文件存在
    ]
    
    # 检查文件是否存在，如果不存在则提示
    existing_files = [f for f in test_files if os.path.exists(f)]
    
    if not existing_files:
        print("=" * 60)
        print("提示：未找到测试文件")
        print("=" * 60)
        print("请修改脚本中的 file_paths 列表，指定要转写的本地音频文件路径")
        print("\n示例：")
        print("  test_files = [")
        print("      'path/to/your/audio1.wav',")
        print("      'path/to/your/audio2.mp3',")
        print("  ]")
        sys.exit(1)
    
    try:
        success = test_asr_with_upload(
            file_paths=existing_files,
            model_name="paraformer-v2",  # ASR 模型名称
            language_hints=["ja"]  # 默认日语，可修改为其他语言：zh(中文), en(英文), yue(粤语), ko(韩语), de(德语), fr(法语), ru(俄语)
        )
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

