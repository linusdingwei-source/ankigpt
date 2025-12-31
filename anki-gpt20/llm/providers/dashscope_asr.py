# anki_gpt_addon/llm/providers/dashscope_asr.py
import logging
import json
import urllib.request
import urllib.error
import time
from http import HTTPStatus
from typing import Dict, Any, Optional, List

import dashscope
from dashscope.audio.asr import Transcription

# 相对导入
from ..interfaces import ASRService
from ...consts import ADDON_NAME

logger = logging.getLogger(ADDON_NAME)

# --- DashScope ASR 模型常量 ---
DASHSCOPE_ASR_MODEL = "paraformer-v2"
DEFAULT_LANGUAGE_HINTS = ["ja"]  # 默认日语


class DashScopeASRService(ASRService):
    """
    使用 DashScope ASR API 进行音频转文字服务
    """
    
    def __init__(self, api_key: str, model: str = DASHSCOPE_ASR_MODEL):
        """
        初始化 DashScope ASR 服务
        
        Args:
            api_key: DashScope API Key
            model: ASR 模型名称，默认为 paraformer-v2
        """
        self.api_key = api_key
        self.model = model
        dashscope.api_key = self.api_key
        logger.debug(f"[{self.__class__.__name__}] Initialized with model '{self.model}'.")
    
    def transcribe(self, audio_url: str, language_hints: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        将音频转换为文字
        
        Args:
            audio_url: 音频文件的URL地址
            language_hints: 语言提示列表，默认为日语
        
        Returns:
            包含转写结果的字典
        """
        logger.info(f"[{self.__class__.__name__}] 开始转写任务，音频URL: {audio_url}")
        
        if language_hints is None:
            language_hints = DEFAULT_LANGUAGE_HINTS
        
        try:
            # 调用异步转写API
            logger.info(f"[{self.__class__.__name__}] 调用Transcription.async_call")
            try:
                task_response = Transcription.async_call(
                    model=self.model,
                    file_urls=[audio_url],
                    language_hints=language_hints
                )
                logger.info(f"[{self.__class__.__name__}] async_call返回: status_code={task_response.status_code if hasattr(task_response, 'status_code') else 'N/A'}")
            except Exception as e:
                logger.exception(f"[{self.__class__.__name__}] async_call调用失败: {e}")
                return {"success": False, "error": f"调用转写API失败: {str(e)}"}
            
            if not task_response:
                logger.error(f"[{self.__class__.__name__}] task_response为空")
                return {"success": False, "error": "转写任务提交失败，响应为空"}
            if not task_response.output:
                logger.error(f"[{self.__class__.__name__}] task_response.output为空")
                return {"success": False, "error": "转写任务提交失败，output为空"}
            if not task_response.output.task_id:
                logger.error(f"[{self.__class__.__name__}] task_id为空")
                return {"success": False, "error": "转写任务提交失败，未获取到任务ID"}
            
            task_id = task_response.output.task_id
            logger.info(f"[{self.__class__.__name__}] ASR任务已提交，task_id: {task_id}")
            
            # 等待转写完成
            logger.info(f"[{self.__class__.__name__}] 开始等待转写完成，task_id: {task_id}")
            try:
                # Transcription.wait 可能会阻塞，需要设置超时
                transcribe_response = Transcription.wait(task=task_id, timeout=300)  # 5分钟超时
                logger.info(f"[{self.__class__.__name__}] 转写完成，status_code: {transcribe_response.status_code if hasattr(transcribe_response, 'status_code') else 'N/A'}")
            except Exception as e:
                logger.exception(f"[{self.__class__.__name__}] 等待转写完成时发生异常: {e}")
                return {"success": False, "error": f"等待转写完成失败: {str(e)}"}
            
            if not transcribe_response:
                logger.error(f"[{self.__class__.__name__}] transcribe_response为空")
                return {"success": False, "error": "转写响应为空"}
            
            if transcribe_response.status_code != HTTPStatus.OK:
                error_msg = f"转写失败，状态码: {transcribe_response.status_code}"
                if hasattr(transcribe_response, 'message'):
                    error_msg += f", 错误信息: {transcribe_response.message}"
                logger.error(f"[{self.__class__.__name__}] {error_msg}")
                return {"success": False, "error": error_msg}
            
            # 获取转写结果URL
            if not transcribe_response.output:
                logger.error(f"[{self.__class__.__name__}] transcribe_response.output为空")
                return {"success": False, "error": "转写结果output为空"}
            
            # 检查task_status
            task_status = getattr(transcribe_response.output, 'task_status', None)
            logger.info(f"[{self.__class__.__name__}] 任务状态: {task_status}")
            if task_status != "SUCCEEDED":
                return {"success": False, "error": f"转写任务失败，状态: {task_status}"}
            
            # results是一个列表，每个元素是字典
            results = getattr(transcribe_response.output, 'results', None)
            if not results or len(results) == 0:
                logger.error(f"[{self.__class__.__name__}] results为空")
                return {"success": False, "error": "转写结果results为空"}
            
            result = results[0]
            # result是字典，使用字典访问方式
            if isinstance(result, dict):
                subtask_status = result.get('subtask_status', '')
                logger.info(f"[{self.__class__.__name__}] 子任务状态: {subtask_status}")
                if subtask_status != "SUCCEEDED":
                    return {"success": False, "error": f"转写子任务失败，状态: {subtask_status}"}
                transcription_url = result.get('transcription_url', '')
            else:
                # 如果是对象，使用属性访问
                subtask_status = getattr(result, 'subtask_status', '')
                logger.info(f"[{self.__class__.__name__}] 子任务状态: {subtask_status}")
                if subtask_status != "SUCCEEDED":
                    return {"success": False, "error": f"转写子任务失败，状态: {subtask_status}"}
                transcription_url = getattr(result, 'transcription_url', '')
            
            if not transcription_url:
                logger.error(f"[{self.__class__.__name__}] transcription_url为空")
                return {"success": False, "error": "转写结果URL为空"}
            
            logger.info(f"[{self.__class__.__name__}] Transcription URL: {transcription_url}")
            
            # 下载转写结果JSON
            logger.info(f"[{self.__class__.__name__}] 开始下载转写结果")
            transcription_data = self._download_transcription_json(transcription_url)
            
            if not transcription_data:
                return {"success": False, "error": "下载转写结果失败"}
            
            # 提取文本内容
            text_content = self._extract_text_from_transcription(transcription_data)
            
            if not text_content:
                return {"success": False, "error": "未能从转写结果中提取文本"}
            
            logger.info(f"[{self.__class__.__name__}] 提取的文本: {text_content[:100]}...")
            
            # 提取时间戳数据（如果存在）
            timestamps = self._extract_timestamps_from_transcription(transcription_data)
            logger.info(f"[{self.__class__.__name__}] 提取的时间戳数量: {len(timestamps) if timestamps else 0}")
            
            return {
                "success": True,
                "text": text_content,
                "timestamps": timestamps or []
            }
            
        except Exception as e:
            logger.exception(f"[{self.__class__.__name__}] 转写过程中发生异常: {e}")
            return {"success": False, "error": f"转写过程中发生异常: {str(e)}"}
    
    def _download_transcription_json(self, transcription_url: str) -> Optional[Dict[str, Any]]:
        """
        下载转写结果JSON文件（带重试机制）
        
        Args:
            transcription_url: 转写结果JSON的URL
        
        Returns:
            JSON数据字典，失败返回None
        """
        max_retries = 3
        timeout = 30
        base_delay = 0.5
        
        for attempt in range(max_retries):
            try:
                # 在重试前添加延迟
                if attempt > 0:
                    delay = base_delay * (2 ** (attempt - 1))
                    logger.debug(f"[{self.__class__.__name__}] Waiting {delay:.1f}s before retry...")
                    time.sleep(delay)
                
                logger.info(f"[{self.__class__.__name__}] Downloading transcription JSON from: {transcription_url} (attempt {attempt + 1}/{max_retries})")
                req = urllib.request.Request(transcription_url)
                
                http_response = None
                try:
                    http_response = urllib.request.urlopen(req, timeout=timeout)
                    data = http_response.read().decode('utf-8')
                    return json.loads(data)
                finally:
                    # 确保连接被正确关闭
                    if http_response:
                        try:
                            http_response.close()
                        except Exception:
                            pass
                            
            except (urllib.error.URLError, OSError) as e:
                error_msg = str(e)
                logger.warning(f"[{self.__class__.__name__}] Download error (attempt {attempt + 1}/{max_retries}): {error_msg}")
                
                # 对于 Bad file descriptor 错误，增加额外延迟
                if "Bad file descriptor" in error_msg or "Errno 9" in error_msg:
                    if attempt < max_retries - 1:
                        extra_delay = 1.0 * (attempt + 1)
                        logger.debug(f"[{self.__class__.__name__}] Bad file descriptor detected, adding extra delay: {extra_delay:.1f}s")
                        time.sleep(extra_delay)
                
                if attempt == max_retries - 1:
                    logger.exception(f"[{self.__class__.__name__}] Failed to download transcription JSON after {max_retries} attempts: {e}")
                    return None
            except Exception as e:
                logger.exception(f"[{self.__class__.__name__}] Failed to download transcription JSON: {e}")
                if attempt == max_retries - 1:
                    return None
        
        return None
    
    def _extract_text_from_transcription(self, transcription_data: Dict[str, Any]) -> str:
        """
        从转写结果中提取文本内容
        
        Args:
            transcription_data: 转写结果的JSON数据
        
        Returns:
            提取的文本内容
        """
        try:
            logger.info(f"[{self.__class__.__name__}] 开始提取文本，数据keys: {list(transcription_data.keys())}")
            transcripts = transcription_data.get('transcripts', [])
            logger.info(f"[{self.__class__.__name__}] transcripts数量: {len(transcripts)}")
            
            if not transcripts:
                logger.warning(f"[{self.__class__.__name__}] transcripts为空")
                return ""
            
            # 提取所有transcript的text字段并合并
            texts = []
            for idx, transcript in enumerate(transcripts):
                text = transcript.get('text', '')
                logger.info(f"[{self.__class__.__name__}] transcript[{idx}].text长度: {len(text) if text else 0}")
                if text:
                    texts.append(text)
            
            result_text = ' '.join(texts) if texts else ""
            logger.info(f"[{self.__class__.__name__}] 提取的文本长度: {len(result_text)}, 前100字符: {result_text[:100] if result_text else 'None'}")
            return result_text
        except Exception as e:
            logger.exception(f"[{self.__class__.__name__}] 提取文本时发生异常: {e}")
            return ""
    
    def _extract_timestamps_from_transcription(self, transcription_data: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
        """
        从转写结果中提取时间戳数据
        
        Args:
            transcription_data: 转写结果的JSON数据
        
        Returns:
            时间戳数据列表，格式与TTS返回的时间戳一致
        """
        try:
            logger.info(f"[{self.__class__.__name__}] 开始提取时间戳")
            transcripts = transcription_data.get('transcripts', [])
            if not transcripts:
                logger.warning(f"[{self.__class__.__name__}] transcripts为空")
                return None
            
            timestamps = []
            for transcript in transcripts:
                sentences = transcript.get('sentences', [])
                for sentence in sentences:
                    words = sentence.get('words', [])
                    for word in words:
                        # 转换ASR时间戳格式到TTS时间戳格式
                        # ASR格式: begin_time, end_time (毫秒)
                        # TTS格式: start, end (秒)
                        begin_time_ms = word.get('begin_time', 0)
                        end_time_ms = word.get('end_time', 0)
                        text = word.get('text', '')
                        
                        if text:  # 只添加有文本的时间戳
                            # 前端期望的格式：begin_time 和 end_time（单位：毫秒）
                            timestamps.append({
                                'begin_time': begin_time_ms,  # 保持毫秒单位
                                'end_time': end_time_ms,      # 保持毫秒单位
                                'text': text
                            })
            
            logger.info(f"[{self.__class__.__name__}] 提取了 {len(timestamps)} 个时间戳")
            return timestamps if timestamps else None
        except Exception as e:
            logger.exception(f"[{self.__class__.__name__}] 提取时间戳时发生异常: {e}")
            return None

