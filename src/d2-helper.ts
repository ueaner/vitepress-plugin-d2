/**
 * 安全地去除 D2 代码中的所有注释
 * D2 注释语法：
 * - 单行注释: 以 # 开头直到行尾
 * - 多行注释: 由 """ 包围
 * 该函数会正确处理字符串中的注释标记，避免误处理
 * @param code D2 代码
 * @returns 去除注释后的 D2 代码
 */
export function removeCommentsFromD2(code: string): string {
  let result = "";
  let i = 0;
  let inSingleQuoteString = false;
  let inDoubleQuoteString = false;

  while (i < code.length) {
    const currentChar = code[i];
    const nextChar = i + 1 < code.length ? code[i + 1] : "";
    const next2Char = i + 2 < code.length ? code[i + 2] : "";

    // 检查是否在字符串中切换状态
    if (
      currentChar === '"' &&
      !inSingleQuoteString &&
      !(i >= 2 && code[i - 1] === '"' && code[i - 2] === '"') && // 不在 """ 中
      !(i + 2 < code.length && nextChar === '"' && next2Char === '"')
    ) {
      // 不是开始的 """
      // 检查是否是转义的引号
      if (i > 0 && code[i - 1] === "\\") {
        // 这是转义的引号，不切换状态
        result += currentChar;
        i++;
        continue;
      }

      // 切换双引号字符串状态
      inDoubleQuoteString = !inDoubleQuoteString;
      result += currentChar;
      i++;
      continue;
    }

    if (currentChar === "'" && !inDoubleQuoteString) {
      // 检查是否是转义的引号
      if (i > 0 && code[i - 1] === "\\") {
        // 这是转义的引号，不切换状态
        result += currentChar;
        i++;
        continue;
      }

      // 切换单引号字符串状态
      inSingleQuoteString = !inSingleQuoteString;
      result += currentChar;
      i++;
      continue;
    }

    // 检查是否是多行注释的开始（不在字符串中且是 """）
    if (!inSingleQuoteString && !inDoubleQuoteString && currentChar === '"' && nextChar === '"' && next2Char === '"') {
      // 检查多行注释是否在行首开始（前面是换行符、字符串开始或只有空白字符）
      // 检查在遇到 """ 之前，从上一个换行符开始到 """ 之间是否只有空白字符
      let startsAtLineStart = i === 0 || code[i - 1] === "\n";
      if (!startsAtLineStart && i > 0) {
        // 查找上一个换行符的位置
        let prevNewlinePos = i - 1;
        while (prevNewlinePos >= 0 && code[prevNewlinePos] !== "\n") {
          prevNewlinePos--;
        }
        if (prevNewlinePos >= 0) {
          // 检查从上一个换行符到当前 """ 之间是否只有空白字符
          let contentBetween = code.substring(prevNewlinePos + 1, i);
          startsAtLineStart = contentBetween.trim() === "";
        }
      }

      // 跳过开始的 """
      i += 3;

      // 记录开始位置，以防找不到结束的 """
      const startPos = i;

      // 跳过多行注释内容，直到找到结束的 """
      while (i <= code.length - 3) {
        if (code[i] === '"' && code[i + 1] === '"' && code[i + 2] === '"') {
          // 找到结束的 """，跳出循环
          break;
        }
        i++;
      }

      // 如果找到了结束的 """
      if (i <= code.length - 3) {
        // 跳过结束的 """
        i += 3;

        // 对于整行的多行注释（在行首或前面只有空白），删除整个注释行
        if (startsAtLineStart) {
          // 跳过跟随的换行符
          if (i < code.length && code[i] === "\n") {
            i++; // 跳过跟随的换行符
            // 跳过换行后的空白字符（这些是注释行的缩进），这样就不会影响下一行的缩进
            while (i < code.length && (code[i] === " " || code[i] === "\t")) {
              i++;
            }
          }
        } else {
          // 对于非整行的多行注释，检查后面是否有换行符
          if (i < code.length && code[i] === "\n") {
            // 跳过跟随的换行符
            i++; // 跳过跟随的换行符
          }
          // 如果后面没有换行符，则完全移除注释而不特殊处理
        }
        // 继续主循环
        continue;
      } else {
        // 如果没找到结束的 """，将开始的 """ 添加到结果中（可能是字符串的一部分）
        // 将 i 重置到开始位置
        i = startPos;
        result += '""';
        continue;
      }
    }

    // 检查是否在非字符串环境中遇到单行注释
    if (!inSingleQuoteString && !inDoubleQuoteString && currentChar === "#") {
      // 检查注释前是否是行首或只有空白字符（即整行注释）
      let isLineComment = i === 0 || code[i - 1] === "\n";
      if (!isLineComment && i > 0) {
        // 查找上一个换行符的位置
        let prevNewlinePos = i - 1;
        while (prevNewlinePos >= 0 && code[prevNewlinePos] !== "\n") {
          prevNewlinePos--;
        }
        if (prevNewlinePos >= 0) {
          // 检查从上一个换行符到当前 # 之间是否只有空白字符
          let contentBetween = code.substring(prevNewlinePos + 1, i);
          isLineComment = contentBetween.trim() === "";
        }
      }

      if (isLineComment) {
        // 如果是整行注释（前面只有空白字符），完全删除该行
        // 跳过从 # 到行尾的所有内容
        while (i < code.length && code[i] !== "\n") {
          i++;
        }

        // 跳过跟随的换行符，并跳过换行符后的前导空白（这些是注释的缩进）
        if (i < code.length && code[i] === "\n") {
          i++; // 跳过跟随的换行符
          // 跳过换行后的空白字符（这些是注释行的缩进），这样就不会影响下一行的缩进
          while (i < code.length && (code[i] === " " || code[i] === "\t")) {
            i++;
          }
        }
      } else {
        // 对于行内注释，只需跳过从 # 到行尾的所有内容
        while (i < code.length && code[i] !== "\n") {
          i++;
        }

        // 如果当前字符是换行符，需要将其添加到结果中，以保持行结构
        if (i < code.length && code[i] === "\n") {
          result += code[i];
          i++;
        }
      }
      continue;
    }

    // 添加当前字符到结果中
    result += currentChar;
    i++;
  }

  // 移除结果末尾的空行（仅包含换行符和空白字符的行）
  result = result.replace(/\s+$/, "");

  // 在所有处理完成后，移除所有行尾的空白字符
  result = result.replace(/[ \t]+(\n)/g, "$1");

  // 同时移除所有单独的空行（由连续的换行符组成）
  result = result.replace(/\n\s*\n/g, "\n");

  return result;
}

/**
 * 从行中移除注释
 * @param line 行内容
 * @returns 移除注释后的行内容
 */
function removeCommentFromLine(line: string): string {
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"' && !inSingleQuote) {
      // 切换双引号状态（如果不在单引号内）
      inDoubleQuote = !inDoubleQuote;
      result += char;
    } else if (char === "'" && !inDoubleQuote) {
      // 切换单引号状态（如果不在双引号内）
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === "#" && !inSingleQuote && !inDoubleQuote) {
      // 如果遇到 # 且不在任何引号内，则这是注释开始
      break;
    } else {
      result += char;
    }

    i++;
  }

  return result;
}

/**
 * 查找代码块的开始和结束边界
 * @param code 代码字符串
 * @param startIndex 开始查找的位置
 * @returns 包含开始和结束位置的对象
 */
function findBlockBounds(code: string, startIndex: number): { start: number; end: number } {
  let braceCount = 0;
  let blockStart = -1;
  let blockEnd = -1;
  let i = startIndex;

  // 找到目标标记后的 '{'
  while (i < code.length) {
    if (code[i] === "{") {
      if (braceCount === 0) {
        blockStart = i + 1; // '{' 后的位置
      }
      braceCount++;
    } else if (code[i] === "}") {
      braceCount--;
      if (braceCount === 0 && blockStart !== -1) {
        blockEnd = i;
        break;
      }
    }
    i++;
  }

  return { start: blockStart, end: blockEnd };
}

/**
 * 从 D2 代码解析 vars.d2-config 配置的函数。
 * 获取 D2 代码中的 vars: { d2-config: { ... } } 部分。
 * @param code D2 图表代码。
 * @returns D2 配置代码。
 */
export function getD2ConfigContent(code: string): string {
  // 首先查找 vars 部分的开始
  const varsStart = code.indexOf("vars:");
  if (varsStart === -1) {
    return "";
  }

  // 找到 vars 块的开始和结束位置
  const { start: varsBlockStart, end: varsBlockEnd } = findBlockBounds(code, varsStart);
  if (varsBlockStart === -1 || varsBlockEnd === -1) {
    return "";
  }

  // 提取 vars 块的内容
  const varsContent = code.substring(varsBlockStart, varsBlockEnd);

  // 在 vars 内容中查找 d2-config 部分
  const d2ConfigStart = varsContent.indexOf("d2-config:");
  if (d2ConfigStart === -1) {
    return "";
  }

  // 找到 d2-config 块的开始和结束位置
  const { start: d2ConfigBlockStart, end: d2ConfigBlockEnd } = findBlockBounds(varsContent, d2ConfigStart);
  if (d2ConfigBlockStart === -1 || d2ConfigBlockEnd === -1) {
    return "";
  }

  // 提取 d2-config 块的内容并解析
  const d2ConfigContent = varsContent.substring(d2ConfigBlockStart, d2ConfigBlockEnd);

  return d2ConfigContent;
}

/**
 * 检测 D2 代码是否包含 composition 关键字 (layers, scenarios, steps)
 * 仅当关键字后跟冒号和花括号时才认为是 composition (如: layers: {)
 * @param code D2 无注释代码
 * @returns 如果包含 composition 关键字则返回 true，否则返回 false
 */
export function hasComposition(code: string): boolean {
  // 检查是否包含 composition 关键字后跟冒号和花括号
  // 匹配模式：关键字 + 可选空白 + 冒号 + 可选空白 + 左花括号
  const regex = /\b(layers|scenarios|steps)\s*:\s*\{/i;
  return regex.test(code);
}
