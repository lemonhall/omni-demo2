/**
 * 音频处理客户端
 * 用于录制音频并与后端API交互
 */
class AudioClient {
  /**
   * 初始化音频客户端
   * @param {Object} config 配置参数
   * @param {string} config.apiUrl API基础URL
   * @param {string} config.processingEndpoint 处理音频的端点
   * @param {boolean} config.debug 是否启用调试模式
   * @param {number} config.defaultRecordingDuration 默认录音时长(毫秒)，默认5000ms
   */
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:8000',
      processingEndpoint: config.processingEndpoint || '/process_audio',
      debug: config.debug || false,
      defaultRecordingDuration: config.defaultRecordingDuration || 5000,
    };
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.recordingTimer = null;

    // 绑定方法
    this.startRecording = this.startRecording.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.processAudio = this.processAudio.bind(this);
  }

  /**
   * 开始录制音频
   * @param {number} duration 录音时长(毫秒)，如果提供则在指定时间后自动停止
   * @returns {Promise} 返回一个Promise，开始录制时resolve
   */
  startRecording(duration) {
    if (this.isRecording) {
      if (this.config.debug) console.log('已经在录音中');
      return Promise.resolve();
    }

    // 清除可能存在的定时器
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    this.audioChunks = [];
    
    return navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.stream = stream;
        
        // 创建MediaRecorder实例，使用适当的音频格式
        const options = { mimeType: 'audio/webm;codecs=opus' };
        try {
          this.mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
          // 如果不支持webm格式，尝试使用默认格式
          this.mediaRecorder = new MediaRecorder(stream);
        }
        
        this.mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0) this.audioChunks.push(event.data);
        });
        
        // 设置录音数据收集间隔为100ms，确保有足够的数据块
        this.mediaRecorder.start(100);
        this.isRecording = true;
        
        if (this.config.debug) console.log('开始录音');
        
        // 如果设置了时长，则在指定时间后自动停止
        const recordingDuration = duration || this.config.defaultRecordingDuration;
        if (recordingDuration > 0) {
          this.recordingTimer = setTimeout(() => {
            if (this.isRecording) {
              if (this.config.debug) console.log(`录音达到设定时长 ${recordingDuration}ms，自动停止`);
              this.stopRecording();
            }
          }, recordingDuration);
        }
        
        return Promise.resolve();
      })
      .catch(error => {
        console.error('获取麦克风权限失败:', error);
        return Promise.reject(error);
      });
  }

  /**
   * 停止录制音频
   * @returns {Promise} 返回一个Promise，包含录制的Blob
   */
  stopRecording() {
    if (!this.isRecording) {
      return Promise.resolve(null);
    }

    // 清除定时器
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    return new Promise(resolve => {
      this.mediaRecorder.addEventListener('stop', () => {
        // 停止所有音轨
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        // 将录制的数据块合并为一个Blob
        // 使用webm作为MIME类型，因为这是MediaRecorder的原生格式
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.isRecording = false;
        
        if (this.config.debug) {
          console.log('停止录音，录制了 ' + this.audioChunks.length + ' 个数据块');
          console.log('音频大小: ' + audioBlob.size + ' 字节');
        }
        
        resolve(audioBlob);
      });
      
      this.mediaRecorder.stop();
    });
  }

  /**
   * 将Blob转换为Base64
   * @param {Blob} blob 要转换的Blob
   * @returns {Promise} 返回一个Promise，包含base64编码的字符串
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // 移除data URL前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 将音频发送到服务器处理
   * @param {Blob} audioBlob 音频Blob
   * @param {Object} options 选项
   * @param {string} options.prompt 提示文本
   * @returns {Promise} 返回一个Promise，包含服务器响应
   */
  processAudio(audioBlob, options = {}) {
    if (!audioBlob) {
      return Promise.reject(new Error('没有音频数据'));
    }

    // 将Blob转换为Base64
    return this.blobToBase64(audioBlob)
      .then(base64Audio => {
        // 准备请求数据
        const requestData = {
          audio_data: base64Audio,
          text_prompt: options.prompt || '这段音频在说什么'
        };

        // 发送请求，添加超时处理
        const timeout = 120000; // 120秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        return fetch(`${this.config.apiUrl}${this.config.processingEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        })
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
          }
          return response.json();
        })
        .catch(error => {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('请求超时');
          }
          throw error;
        });
      });
  }

  /**
   * 播放Base64编码的音频
   * @param {string} base64Audio Base64编码的音频
   * @returns {Promise} 返回一个Promise，音频播放完成时resolve
   */
  playAudio(base64Audio) {
    return new Promise((resolve, reject) => {
      try {
        // 创建一个audio元素
        const audio = new Audio();
        
        // 监听播放结束事件
        audio.addEventListener('ended', () => resolve());
        audio.addEventListener('error', (e) => reject(e));
        
        // 设置音频源
        audio.src = `data:audio/wav;base64,${base64Audio}`;
        
        // 播放音频
        audio.play().catch(e => {
          console.error('播放音频失败:', e);
          reject(e);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 一站式录制和处理音频
   * @param {Object} options 选项
   * @param {string} options.prompt 提示文本
   * @param {boolean} options.returnAudio 是否返回音频
   * @param {boolean} options.autoPlay 是否自动播放返回的音频
   * @param {number} options.duration 录音时长(毫秒)，默认使用配置中的defaultRecordingDuration
   * @param {Function} options.onStart 开始录制时的回调
   * @param {Function} options.onStop 停止录制时的回调
   * @param {Function} options.onProcessing 处理时的回调
   * @param {Function} options.onResult 获得结果时的回调
   * @returns {Promise} 返回一个Promise，包含处理结果
   */
  recordAndProcess(options = {}) {
    if (options.onStart) options.onStart();
    
    // 使用options中的duration，如果没有则使用配置的默认值
    const duration = options.duration !== undefined ? options.duration : this.config.defaultRecordingDuration;
    
    return this.startRecording(duration)
      .then(() => {
        // 如果设置了duration，录音会自动停止，这里等待录音完成
        if (duration > 0) {
          return new Promise(resolve => {
            // 监听录音停止状态
            const checkRecording = setInterval(() => {
              if (!this.isRecording) {
                clearInterval(checkRecording);
                resolve();
              }
            }, 100);
          });
        }
        // 否则直接返回，让用户手动停止
        return Promise.resolve();
      })
      .then(() => {
        if (options.onStop) options.onStop();
        if (this.isRecording) {
          return this.stopRecording();
        }
        // 获取录音结果
        return this.getLastRecordingBlob();
      })
      .then(audioBlob => {
        if (!audioBlob) {
          throw new Error('没有录音数据');
        }
        
        if (options.onProcessing) options.onProcessing();
        return this.processAudio(audioBlob, {
          prompt: options.prompt,
          returnAudio: options.returnAudio
        });
      })
      .then(result => {
        if (options.onResult) options.onResult(result);
        
        // 如果返回了音频并设置了自动播放
        if (result.audio && options.autoPlay) {
          return this.playAudio(result.audio).then(() => result);
        }
        
        return result;
      });
  }

  /**
   * 获取最后一次录音的Blob
   * @returns {Blob|null} 录音Blob或null
   */
  getLastRecordingBlob() {
    if (this.audioChunks.length === 0) {
      return null;
    }
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }
  
  /**
   * 检查浏览器是否支持所需的API
   * @returns {boolean} 是否支持
   */
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }
}

// 如果在浏览器环境中，将AudioClient挂载到window对象
if (typeof window !== 'undefined') {
  window.AudioClient = AudioClient;
} 