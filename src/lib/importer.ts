import type { ImportDraft } from "./types";

/**
 * 批量导入解析器
 *
 * 输入格式（依据用户 Excel 实际结构）：
 * - 多条提示词堆叠在一段文本里，用空行（连续两个换行）分隔
 * - 每条首行格式 "编号｜标题"（兼容全角 ｜ 与半角 |），其后换行接提示词正文
 * - 也兼容只给标题不带编号的情况
 * - 支持把 HTML <br> 标签当作换行处理
 *
 * 输出：ImportDraft 数组，未做去重
 */
export function parseImportText(raw: string): ImportDraft[] {
  if (!raw || !raw.trim()) return [];

  // 统一换行：<br> / <br/> → 换行；\r\n → \n
  const text = raw
    .replace(/<br\s*\/?>(?:\s*<br\s*\/?>)*/gi, "\n")
    .replace(/\r\n?/g, "\n");

  // 按空行（连续 ≥2 个换行）切分；也允许 \n\n\n+
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  const drafts: ImportDraft[] = [];
  // 兼容编号｜标题 分隔符：全角 ｜ / 半角 | / 中文 ｜
  const sepRe = /^([0-9]{1,3})\s*[|｜]\s*(.+)$/;

  for (const block of blocks) {
    const lines = block.split("\n");
    const firstLine = lines[0].trim();
    if (!firstLine) continue;

    let code = "";
    let title = firstLine;
    const m = firstLine.match(sepRe);
    if (m) {
      code = m[1].replace(/^0+/, "").padStart(2, "0").replace(/^00$/, "0");
      // 保持两位数字编号 01..10
      code = m[1].padStart(2, "0");
      title = m[2].trim();
    }

    const content = lines.slice(1).join("\n").trim();
    if (!title && !content) continue;

    drafts.push({
      code,
      title,
      content,
    });
  }

  return drafts;
}

/**
 * 去重：相同 code+title+content 视为重复，保留首次出现
 */
export function dedupeDrafts(drafts: ImportDraft[]): {
  unique: ImportDraft[];
  duplicates: number;
} {
  const seen = new Set<string>();
  const unique: ImportDraft[] = [];
  let duplicates = 0;
  for (const d of drafts) {
    const key = `${d.code}|${d.title}|${d.content}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    unique.push(d);
  }
  return { unique, duplicates };
}

/** 示例文本，给用户参考格式 */
export const SAMPLE_IMPORT = `01｜天然木材
增强真实天然木材质感，表现自然木纹、木纤维、细微毛孔、天然色差和真实纹理层次；木纹方向严格遵循原产品结构和加工方向，不生成新的木纹。

02｜木皮 / Veneer
增强真实天然木皮纹理，表现细密连续的木纹、自然纹理变化和真实木材纤维；保持木皮纹理与家具结构、拼接方向完全一致。

03｜布艺 / 亚麻
增强真实布艺纤维质感，表现清晰但自然的经纬纱线、织物纤维、细微绒感和真实织物颗粒；保留原有颜色、纹理方向、褶皱和受光关系。`;
