import { Config, Layout, FileType, Theme, D2Config } from "./config.js";
import { getD2ConfigContent, removeCommentsFromD2, hasComposition } from "./d2-helper.js";

/**
 * 解析代码块中图表配置的函数。
 * 使用第一对三引号 (""") 作为配置分隔符。
 * 第一个三引号后面必须跟一个换行符 ("""\n)。
 * 支持命令行参数格式，例如：
 *   --layout=elk
 *   --theme 200
 *   --sketch
 * @param code D2 图表代码。
 * @returns 配置和代码（配置已移除）。
 */
export function parseAndConvertConfig(code: string): {
  config: Config;
  code: string;
} {
  // 定义使用第一对三引号解析配置的正则表达式
  // 模式在字符串开头查找""", 后跟一个换行符, 然后捕获配置内容直到下一个"""
  const configRegex = /^"""\n([\s\S]*?)"""\s*\n?/;
  const config: Config = {};

  // 从代码块中解析配置
  const match = code.match(configRegex);
  if (!match || !match[1]) {
    return { config, code };
  }

  // 字符串配置的临时存储
  const userConfig: Record<string, string> = {};
  const configContent = match[1].trim();
  const configLines = configContent.split("\n");

  for (const line of configLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || !trimmedLine.startsWith("--")) {
      continue;
    }

    // 检查是否有 "=" 分隔符
    if (trimmedLine.includes("=")) {
      const [key, value] = line.split("=").map((s) => s.trim());
      userConfig[key] = value;
    } else {
      // 使用空格分隔符
      const [key, value] = line.split(/\s+/).map((s) => s.trim());
      // 如果参数没有值（布尔参数），则设置为 "true"
      userConfig[key] = value ? value : "true";
    }
  }

  // 通过移除配置块来清理图表代码（仅第一次出现）
  let cleanedCode = code;
  if (match) {
    cleanedCode = code.replace(configRegex, "").trim();
  }

  // 将字符串配置转换为实际配置值
  for (const [key, stringValue] of Object.entries(userConfig)) {
    switch (key) {
      case "--force-appendix":
        config.forceAppendix = stringValue === "true";
        break;
      case "--layout":
        // 将输入值转为大写，以匹配枚举键
        config.layout = Layout[stringValue.toUpperCase() as keyof typeof Layout];
        break;
      case "--theme":
        // 检查值是否为数字字符串，如果是则转换为数字
        if (!isNaN(Number(stringValue))) {
          config.theme = Number(stringValue);
        }
        break;
      case "--dark-theme":
        // 检查值是否为数字字符串，如果是则转换为数字
        if (!isNaN(Number(stringValue))) {
          config.darkTheme = Number(stringValue);
        }
        break;
      case "--pad":
        config.pad = parseInt(stringValue, 10);
        break;
      case "--animate-interval":
        config.animateInterval = parseInt(stringValue, 10);
        break;
      case "--timeout":
        config.timeout = parseInt(stringValue, 10);
        break;
      case "--sketch":
        config.sketch = stringValue === "true";
        break;
      case "--center":
        config.center = stringValue === "true";
        break;
      case "--scale":
        config.scale = parseFloat(stringValue);
        break;
      case "--target":
        config.target = stringValue;
        break;
      case "--stdout-format":
        // 将值转为大写，以匹配枚举键
        config.stdoutFormat = FileType[stringValue.toUpperCase() as keyof typeof FileType];
        break;
      case "--directory":
        config.directory = stringValue;
        break;
    }
  }

  return { config, code: cleanedCode };
}

/**
 * 解析 d2-config 内容并返回 D2Config 对象
 * @param content d2-config 内容
 * @returns 解析出的 D2Config 对象
 */
function parseAndConvertD2Config(code: string): D2Config {
  const d2Config: D2Config = {};

  const content = getD2ConfigContent(code);
  if (content.length === 0) {
    return d2Config;
  }

  // 按行分割配置内容并解析
  const configLines = content.split("\n");

  for (const line of configLines) {
    if (!line) {
      // 跳过空行
      continue;
    }

    // 解析键值对
    const parts = line.split(":");
    if (parts.length != 2) {
      continue;
    }
    const key = parts[0].trim();
    const stringValue = parts[1].trim();

    // 根据键映射到 D2Config 接口
    switch (key) {
      case "layout-engine":
        // 移除值两端的引号（如果存在）
        d2Config.layoutEngine = stripQuotes(stringValue);
        break;
      case "theme-id":
        d2Config.themeID = parseInt(stringValue, 10);
        break;
      case "dark-theme-id":
        d2Config.darkThemeID = parseInt(stringValue, 10);
        break;
      case "sketch":
        d2Config.sketch = stringValue === "true";
        break;
      case "center":
        d2Config.center = stringValue === "true";
        break;
      case "pad":
        d2Config.pad = parseInt(stringValue, 10);
        break;
    }
  }

  return d2Config;
}

/**
 * 移除字符串两端的引号
 * @param str 字符串
 * @returns 移除引号后的字符串
 */
function stripQuotes(str: string): string {
  if (str.length < 2) {
    return str;
  }

  // 检查是否以单引号或双引号开始和结束
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.substring(1, str.length - 1);
  }

  return str;
}

/**
 * 将 D2Config 转换为 Config 配置
 * @param d2Config D2 配置对象
 * @returns 转换后的 Config 配置对象
 */
export function convertD2ConfigToConfig(d2Config: D2Config): Partial<Config> {
  const config: Partial<Config> = {};

  if (d2Config.layoutEngine != null) {
    // 将 layoutEngine 字符串转换为 Layout 枚举
    const layoutKey = d2Config.layoutEngine.toUpperCase() as keyof typeof Layout;
    if (Layout[layoutKey]) {
      config.layout = Layout[layoutKey];
    }
  }

  if (d2Config.themeID != null) {
    // 直接使用数字 ID，因为 D2 接受任意主题 ID 数字
    // 使用类型断言来满足类型检查器
    config.theme = d2Config.themeID as Theme;
  }

  if (d2Config.darkThemeID != null) {
    // 直接使用数字 ID，因为 D2 接受任意主题 ID 数字
    // 使用类型断言来满足类型检查器
    config.darkTheme = d2Config.darkThemeID as Theme;
  }

  if (d2Config.sketch != null) {
    config.sketch = d2Config.sketch;
  }

  if (d2Config.center != null) {
    config.center = d2Config.center;
  }

  if (d2Config.pad != null) {
    config.pad = d2Config.pad;
  }

  return config;
}

/**
 * 解析所有配置源并返回最终配置
 * 优先级：默认配置 -> 普通代码块配置 -> d2-config 配置 -> composition 自动设置
 * 注意：d2-config 配置优先级最高，但如果没有显式设置 animateInterval 且检测到 composition，则自动设置
 * @param content D2 内容
 * @param defaultConfig 默认配置
 * @returns 包含最终配置和处理后代码的对象
 */
export function parseConfig(content: string, defaultConfig: Config): { config: Config; code: string } {
  // 解析位于代码块顶部注释中的 d2 命令参数配置。
  const { config: diagramConfig, code } = parseAndConvertConfig(content);

  // 去除 D2 代码中的所有注释
  const cleanedCode = removeCommentsFromD2(code);

  // 解析位于代码块中的 d2 配置 (d2-config)。
  const d2FileConfig = parseAndConvertD2Config(cleanedCode);

  // 将 D2Config 转换为标准配置
  const d2FileConvertedConfig = d2FileConfig ? convertD2ConfigToConfig(d2FileConfig) : {};

  // 合并配置
  const mergedConfig = {
    ...defaultConfig,
    ...diagramConfig,
    ...d2FileConvertedConfig,
  };

  // 如果没有显式设置 --animate-interval 且检测到 composition，则自动设置默认动画间隔为 1200ms
  if (mergedConfig.animateInterval == null && hasComposition(code)) {
    mergedConfig.animateInterval = 1200;
  }

  return { config: mergedConfig, code };
}
