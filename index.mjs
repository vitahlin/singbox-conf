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

/**
 * 解析SS协议URL内容
 * @param {string} content - 包含SS协议URL的文本内容
 * @returns {Array} 解析后的SS节点数组
 */
export const parseSSContent = (content) => {
  try {
    // 按行分割内容，过滤空行
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const ssNodes = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 检查是否是SS协议
      if (!trimmedLine.startsWith('ss://')) {
        continue;
      }

      try {
        // 移除 ss:// 前缀
        const ssUrl = trimmedLine.substring(5);

        // 分离备注部分（#后面的内容）
        const [mainPart, ...remarkParts] = ssUrl.split('#');
        const remark = remarkParts.length > 0 ? decodeURIComponent(remarkParts.join('#')) : '';

        // 分离服务器和端口部分（@后面的内容）
        const [encodedPart, serverPart] = mainPart.split('@');

        if (!encodedPart || !serverPart) {
          console.warn('无效的SS URL格式:', trimmedLine);
          continue;
        }

        // 解析服务器和端口
        const [server, port] = serverPart.split(':');

        // 解码base64编码的认证信息
        let decodedAuth;
        try {
          decodedAuth = Buffer.from(encodedPart, 'base64').toString('utf-8');
        } catch (e) {
          console.warn('无法解码base64认证信息:', encodedPart);
          continue;
        }

        // 解析认证信息：method:password
        const [method, password] = decodedAuth.split(':');

        if (!method || !password || !server || !port) {
          console.warn('解析SS节点信息不完整:', trimmedLine);
          continue;
        }

        // 构建节点对象
        const ssNode = {
          type: 'ss',
          server: server,
          port: parseInt(port, 10),
          method: method,
          password: password,
          remark: remark,
          original: trimmedLine
        };

        ssNodes.push(ssNode);

      } catch (error) {
        console.warn('解析SS节点时出错:', error.message, '原始内容:', trimmedLine);
      }
    }

    return ssNodes;
  } catch (error) {
    console.error('解析SS内容时出错:', error);
    throw error;
  }
};

/**
 * 解析Trojan协议URL内容
 * @param {string} content - 包含Trojan协议URL的文本内容
 * @returns {Array} 解析后的Trojan节点数组
 */
export const parseTrojanContent = (content) => {
  try {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const trojanNodes = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 检查是否是Trojan协议
      if (!trimmedLine.startsWith('trojan://')) {
        continue;
      }

      try {
        // 移除 trojan:// 前缀
        const trojanUrl = trimmedLine.substring(9);

        // 分离备注部分（#后面的内容）
        const [mainPart, ...remarkParts] = trojanUrl.split('#');
        const remark = remarkParts.length > 0 ? decodeURIComponent(remarkParts.join('#')) : '';

        // 分离服务器和端口部分（@后面的内容）
        const [password, serverPart] = mainPart.split('@');

        if (!password || !serverPart) {
          console.warn('无效的Trojan URL格式:', trimmedLine);
          continue;
        }

        // 解析服务器、端口和参数
        const [serverPortPart, ...queryParts] = serverPart.split('?');
        const [server, port] = serverPortPart.split(':');

        // 解析查询参数
        const params = {};
        if (queryParts.length > 0) {
          const queryString = queryParts.join('?');
          const urlParams = new URLSearchParams(queryString);
          for (const [key, value] of urlParams) {
            params[key] = value;
          }
        }

        if (!server || !port) {
          console.warn('解析Trojan节点信息不完整:', trimmedLine);
          continue;
        }

        // 构建节点对象
        const trojanNode = {
          type: 'trojan',
          server: server,
          port: parseInt(port, 10),
          password: password,
          sni: params.sni || params.peer || server,
          alpn: params.alpn || '',
          allowInsecure: params.allowInsecure === '1' || params.allowInsecure === 'true',
          remark: remark,
          original: trimmedLine
        };

        trojanNodes.push(trojanNode);

      } catch (error) {
        console.warn('解析Trojan节点时出错:', error.message, '原始内容:', trimmedLine);
      }
    }

    return trojanNodes;
  } catch (error) {
    console.error('解析Trojan内容时出错:', error);
    throw error;
  }
};

/**
 * 解析VMess协议URL内容
 * @param {string} content - 包含VMess协议URL的文本内容
 * @returns {Array} 解析后的VMess节点数组
 */
export const parseVmessContent = (content) => {
  try {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const vmessNodes = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 检查是否是VMess协议
      if (!trimmedLine.startsWith('vmess://')) {
        continue;
      }

      try {
        // 移除 vmess:// 前缀
        const vmessUrl = trimmedLine.substring(8);

        // 解码base64编码的配置信息
        let vmessConfig;
        try {
          const decodedConfig = Buffer.from(vmessUrl, 'base64').toString('utf-8');
          vmessConfig = JSON.parse(decodedConfig);
        } catch (e) {
          console.warn('无法解码VMess配置信息:', vmessUrl);
          continue;
        }

        // 验证必需字段
        if (!vmessConfig.add || !vmessConfig.port || !vmessConfig.id) {
          console.warn('VMess配置信息不完整:', trimmedLine);
          continue;
        }

        // 构建节点对象
        const vmessNode = {
          type: 'vmess',
          server: vmessConfig.add,
          port: parseInt(vmessConfig.port, 10),
          uuid: vmessConfig.id,
          alterId: parseInt(vmessConfig.aid || '0', 10),
          security: vmessConfig.scy || 'auto',
          network: vmessConfig.net || 'tcp',
          headerType: vmessConfig.type || 'none',
          host: vmessConfig.host || '',
          path: vmessConfig.path || '',
          tls: vmessConfig.tls === 'tls' || vmessConfig.tls === '1',
          sni: vmessConfig.sni || '',
          remark: vmessConfig.ps || '',
          original: trimmedLine
        };

        vmessNodes.push(vmessNode);

      } catch (error) {
        console.warn('解析VMess节点时出错:', error.message, '原始内容:', trimmedLine);
      }
    }

    return vmessNodes;
  } catch (error) {
    console.error('解析VMess内容时出错:', error);
    throw error;
  }
};

/**
 * 解析所有支持的协议内容
 * @param {string} content - 包含各种协议URL的文本内容
 * @returns {Object} 包含所有解析结果的对象
 */
export const parseAllProtocols = (content) => {
  const ssNodes = parseSSContent(content);
  const trojanNodes = parseTrojanContent(content);
  const vmessNodes = parseVmessContent(content);

  return {
    ss: ssNodes,
    trojan: trojanNodes,
    vmess: vmessNodes,
    total: ssNodes.length + trojanNodes.length + vmessNodes.length
  };
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
          success: false,
          error: '请求体必须包含url字段',
          example: { url: 'https://example.com/api/data' }
        })
      };
    }

    // 从URL获取并解析base64内容
    console.log('正在请求URL:', body.url);
    const decodedContent = await fetchAndDecodeBase64(body.url, body.options || {});

    // 解析所有支持的协议内容
    const parsedNodes = parseAllProtocols(decodedContent);

    // 返回解析后的内容
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        url: body.url,
        rawContent: decodedContent,
        nodes: parsedNodes,
        summary: {
          ss: parsedNodes.ss.length,
          trojan: parsedNodes.trojan.length,
          vmess: parsedNodes.vmess.length,
          total: parsedNodes.total
        }
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
        success: false,
        error: '处理请求时发生错误',
        message: error.message
      })
    };
  }
};
