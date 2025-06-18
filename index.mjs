import fetch from 'node-fetch';
import { Buffer } from 'buffer';

/**
 * 请求URL并解析base64返回内容为文本
 * @param {string} url - 要请求的URL地址
 * @param {Object} options - 请求选项 (可选)
 * @returns {Promise<string>} 解析后的文本内容
 */
export const fetchAndDecodeBase64 = async (url, options = {}) => {
  try {
    // 发送HTTP请求
    const response = await fetch(url, {
      method: 'GET',
      ...options
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status}`);
    }

    // 获取响应文本 (假设返回的是base64字符串)
    const base64Content = await response.text();

    // 解码base64为文本
    const decodedText = Buffer.from(base64Content, 'base64').toString('utf-8');

    return decodedText;
  } catch (error) {
    console.error('请求或解析失败:', error);
    throw error;
  }
};

export const handler = async (event) => {
  try {
    // 解析请求体
    let body;
    if (event.body) {
      body = JSON.parse(event.body);
    } else if (event.isBase64Encoded) {
      const buff = Buffer.from(event.body, 'base64');
      body = JSON.parse(buff.toString('utf-8'));
    }

    // 验证请求体格式 - 期望包含url字段
    if (!body || typeof body !== 'object' || !body.url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: '请求体必须包含url字段',
          example: { url: 'https://example.com/api/data' }
        })
      };
    }

    // 从URL获取并解析base64内容
    console.log('正在请求URL:', body.url);
    const decodedContent = await fetchAndDecodeBase64(body.url, body.options || {});

    // 返回解析后的内容
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        url: body.url,
        content: decodedContent
      })
    };
  } catch (error) {
    console.error('处理请求时出错:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: '处理请求时发生错误',
        message: error.message
      })
    };
  }
};
