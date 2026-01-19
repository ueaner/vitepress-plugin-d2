import { existsSync, readFileSync } from "fs";
import { Config, FileType } from "./config.js";
import { parseConfig } from "./config-parser.js";
import { readDiagramContent, generateDiagram } from "./diagram-generator.js";

/**
 * 渲染 SVG 内容
 * @param svgFilePath SVG 文件路径
 * @returns 渲染的 SVG HTML
 */
export function renderSVG(svgFilePath: string): string {
  // 检查文件是否存在
  if (!existsSync(svgFilePath)) {
    console.error(`SVG file does not exist: ${svgFilePath}`);
    throw new Error(`SVG file does not exist: ${svgFilePath}`);
  }

  // 直接嵌入 SVG XML 到 HTML 以启用交互功能
  let svgContent = readFileSync(svgFilePath, { encoding: "utf-8" });

  // 替换 <style> 标签为 <svg:style> 以避免 Vue 错误
  svgContent = svgContent.replace(/<style/gi, "<svg:style");
  svgContent = svgContent.replace(/<\/style>/gi, "</svg:style>");

  // 替换 <script> 标签为 <svg:script> 以避免 Vue 错误
  svgContent = svgContent.replace(/<script/gi, "<svg:script");
  svgContent = svgContent.replace(/<\/script>/gi, "</svg:script>");

  // 移除 XML 处理指令（如果存在）
  svgContent = svgContent.replace(/<\?xml[^>]*\?>/gi, "");

  return `<div class="d2-diagram">${svgContent}</div>`;
}

/**
 * 渲染图像内容
 * @param imageFilePath 图像文件路径
 * @param fileType 文件类型
 * @returns 渲染的图像 HTML
 */
export function renderImage(imageFilePath: string, fileType: FileType): string {
  // 检查文件是否存在
  if (!existsSync(imageFilePath)) {
    console.error(`Image file does not exist: ${imageFilePath}`);
    throw new Error(`Image file does not exist: ${imageFilePath}`);
  }

  // 从文件类型获取媒体类型
  let mediaType: string;
  switch (fileType) {
    case FileType.SVG:
      mediaType = "image/svg+xml";
      break;
    case FileType.BASE64_SVG:
      mediaType = "image/svg+xml";
      break;
    case FileType.PNG:
      mediaType = "image/png";
      break;
    case FileType.GIF:
      mediaType = "image/gif";
      break;
  }

  // 创建 base64 格式的图像数据 URI
  const imageContent = readFileSync(imageFilePath, { encoding: "base64" });
  const dataUri = `data:${mediaType};base64,${imageContent}`;
  const imageHtml = `<img src="${dataUri}" class="d2-diagram" alt="D2 Diagram" />`;

  return imageHtml;
}

/**
 * 根据文件类型选择渲染方式
 * @param filePath 图像文件路径
 * @param fileType 文件类型
 * @returns 渲染的 HTML 字符串
 */
export function renderOutput(filePath: string, fileType: FileType): string {
  if (fileType === FileType.SVG) {
    return renderSVG(filePath);
  } else {
    return renderImage(filePath, fileType);
  }
}

/**
 * D2 插件，将 Markdown D2 代码块转换为图像
 * @param md Markdown 解析器
 * @param defaultConfig 默认 D2 插件配置
 */
export function d2(md: any, defaultConfig: Config = {}) {
  // 存储原始 fence 以便在没有 D2 图表时返回
  const fence = md.renderer.rules.fence.bind(md.renderer.rules);

  md.renderer.rules.fence = (...args: any[]) => {
    const [tokens, idx] = args;
    const token = tokens[idx];
    const info = token.info.trim();

    // 检查是否为 D2 代码块，以及是否需要转换为图像
    if (!info.startsWith("d2") || (defaultConfig.onlyConvertMarkedImage && !/:image\b/.test(info))) {
      return fence(...args);
    }
    // console.debug("token info:", token.info);

    // 读取 D2 内容（可能来自代码片段文件）
    const content = readDiagramContent(token);
    if (!content) {
      return fence(...args);
    }

    // 解析所有配置源
    const { config, code } = parseConfig(content, defaultConfig);

    try {
      // 生成图表
      const result = generateDiagram(code, config);
      // 根据文件类型自动选择渲染方式
      const imageHtml = renderOutput(result.imageFilePath, result.fileType);
      // 返回渲染的图表图像 HTML
      return imageHtml;
    } catch (error) {
      console.error("Error rendering D2 diagram:", error);
      // 如果生成失败，返回原始代码块
      return fence(...args);
    }
  };
}
