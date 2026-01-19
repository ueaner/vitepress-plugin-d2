import { spawnSync } from "child_process";
import { createHash } from "crypto";
import fs, { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { Config, FileType } from "./config.js";

/**
 * 生成内容的短哈希值
 * @param content 要生成哈希的内容
 * @param length 哈希值的长度，默认为 7
 * @returns 指定长度的 SHA256 哈希值十六进制字符串
 */
function getShortHash(content: string, length = 7) {
  return createHash("sha256").update(content).digest("hex").slice(0, length);
}

/**
 * 从 token 读取 D2 内容（可能来自外部文件）
 * @param token Markdown token
 * @returns D2 内容或 null
 */
export function readDiagramContent(token: any): string | null {
  let content = token.content.trim();
  if (content) {
    return content;
  }

  // 从外部文件读取内容
  const [src, _] = token.src ?? [];
  if (!src) return null;

  try {
    const stat = fs.statSync(src);
    const isAFile = stat.isFile();
    if (!isAFile) return null;

    content = fs.readFileSync(src, "utf8").trim();
    return content;
  } catch (error) {
    console.error(`Error reading D2 file: ${src}`, error);
    return null;
  }
}

/**
 * 构建 D2 命令行参数
 * @param config 配置对象
 * @param tempD2FilePath 临时 D2 文件路径
 * @param imageFilePath 输出图像文件路径
 * @returns D2 命令行参数数组
 */
export function buildArgs(config: Config, tempD2FilePath: string = "", imageFilePath: string = ""): string[] {
  const args: string[] = [];
  if (tempD2FilePath) {
    args.push(tempD2FilePath);
  }
  if (imageFilePath) {
    args.push(imageFilePath);
  }

  if (config.forceAppendix === true) {
    args.push("--force-appendix");
  }

  if (config.layout != null) {
    args.push(`--layout=${config.layout}`);
  }

  if (config.theme != null) {
    args.push(`--theme=${config.theme}`);
  }

  if (config.darkTheme != null) {
    args.push(`--dark-theme=${config.darkTheme}`);
  }

  if (config.pad != null) {
    args.push(`--pad=${config.pad}`);
  }

  if (config.animateInterval != null) {
    args.push(`--animate-interval=${config.animateInterval}`);
  }

  if (config.timeout != null) {
    args.push(`--timeout=${config.timeout}`);
  }

  if (config.sketch === true) {
    args.push("--sketch");
  }

  if (config.center === true) {
    args.push("--center");
  }

  if (config.scale != null) {
    args.push(`--scale=${config.scale}`);
  }

  if (config.target != null) {
    args.push(`--target=${config.target}`);
  }

  // 当文件类型为 SVG 时，自动添加 --no-xml-tag 参数，与 renderSVG 中移除 XML 标签的行为保持一致
  if (config.stdoutFormat === FileType.SVG) {
    args.push("--no-xml-tag");
  }

  return args;
}

/**
 * 生成 D2 图表文件
 * @param code D2 代码
 * @param config 配置对象
 * @returns 包含图像文件路径和文件类型的结果对象
 */
export function generateDiagram(code: string, config: Config) {
  // 创建输出目录（如果不存在）
  const outputDir = `${config.directory ?? "d2-diagrams"}`;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 获取文件类型
  const fileType = config.stdoutFormat ?? FileType.SVG;

  // 构建命令行参数
  const args = buildArgs(config);

  // 生成图表图像输出文件的唯一文件名
  const fileID = getShortHash(`${fileType} ${args.join(" ")} ${code}`);
  const imageFilePath = path.join(outputDir, `d2-diagram-${fileID}.${fileType}`);

  if (existsSync(imageFilePath)) {
    // console.debug("Cache hit: ", imageFilePath);
    return { imageFilePath, fileType };
  }

  // 将 D2 图表代码写入临时 .d2 文件
  const tempD2FilePath = path.join(outputDir, "temp.d2");
  writeFileSync(tempD2FilePath, code);

  // 运行 D2 命令生成输出图表图像文件
  const command = spawnSync("d2", [tempD2FilePath, imageFilePath, ...args], {
    encoding: "utf-8",
    stdio: "pipe",
  });

  // console.debug("D2 Command: d2", [tempD2FilePath, imageFilePath, ...args].join(" "));

  // 删除临时 D2 文件
  unlinkSync(tempD2FilePath);

  // 记录 D2 命令的任何错误
  if (command.status !== 0) {
    console.error(`Error: Failed to generate D2 diagram.\n${command.stderr}`);
    throw new Error(`D2 command failed: ${command.stderr}`);
  }

  // 验证输出文件是否已创建
  if (!existsSync(imageFilePath)) {
    const errorMsg = `D2 command completed successfully but output file was not created: ${imageFilePath}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { imageFilePath, fileType };
}
