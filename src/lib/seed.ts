import type { Category, Prompt, Tag } from "./types";

// 基准时间：2026-09-20 00:00:00 UTC，种子数据按序号递增
const BASE = Date.UTC(2026, 8, 20, 0, 0, 0);

/** 一级分类（顶层） */
export const seedCategories: Category[] = [
  // 增强细节（根）：包含材质/道具/水果/厨具等细节增强类提示词
  { id: "cat-detail", name: "增强细节", parentId: null, sortOrder: 1 },
  { id: "cat-general", name: "通用提示词", parentId: null, sortOrder: 2 },
  // 细节增强的二级分类（原一级下移到"增强细节"下）
  { id: "cat-material", name: "材质类", parentId: "cat-detail", sortOrder: 1 },
  { id: "cat-prop", name: "道具类", parentId: "cat-detail", sortOrder: 2 },
  { id: "cat-fruit", name: "水果类", parentId: "cat-detail", sortOrder: 3 },
  { id: "cat-kitchen", name: "厨具类", parentId: "cat-detail", sortOrder: 4 },
];

/** 二级分类（子类） */
export const seedSubcategories: Category[] = [
  // 材质类
  { id: "mat-wood", name: "木材", parentId: "cat-material", sortOrder: 1 },
  { id: "mat-veneer", name: "木皮", parentId: "cat-material", sortOrder: 2 },
  { id: "mat-fabric", name: "布艺", parentId: "cat-material", sortOrder: 3 },
  { id: "mat-flannel", name: "绒布", parentId: "cat-material", sortOrder: 4 },
  { id: "mat-leather", name: "皮革", parentId: "cat-material", sortOrder: 5 },
  { id: "mat-marble", name: "大理石", parentId: "cat-material", sortOrder: 6 },
  { id: "mat-glass", name: "玻璃", parentId: "cat-material", sortOrder: 7 },
  { id: "mat-metal", name: "金属", parentId: "cat-material", sortOrder: 8 },
  { id: "mat-rattan", name: "藤编", parentId: "cat-material", sortOrder: 9 },
  { id: "mat-stone", name: "石材", parentId: "cat-material", sortOrder: 10 },
  // 道具类
  { id: "prop-glass", name: "玻璃杯", parentId: "cat-prop", sortOrder: 1 },
  { id: "prop-vase", name: "陶瓷花瓶", parentId: "cat-prop", sortOrder: 2 },
  { id: "prop-ornament", name: "金属摆件", parentId: "cat-prop", sortOrder: 3 },
  { id: "prop-book", name: "书籍", parentId: "cat-prop", sortOrder: 4 },
  { id: "prop-gvase", name: "玻璃花瓶", parentId: "cat-prop", sortOrder: 5 },
  { id: "prop-candle", name: "蜡烛", parentId: "cat-prop", sortOrder: 6 },
  { id: "prop-dried", name: "干花", parentId: "cat-prop", sortOrder: 7 },
  { id: "prop-tray", name: "果盘", parentId: "cat-prop", sortOrder: 8 },
  // 水果类
  { id: "fruit-lemon", name: "柠檬", parentId: "cat-fruit", sortOrder: 1 },
  { id: "fruit-orange", name: "橙子", parentId: "cat-fruit", sortOrder: 2 },
  { id: "fruit-apple", name: "苹果", parentId: "cat-fruit", sortOrder: 3 },
  { id: "fruit-pear", name: "梨", parentId: "cat-fruit", sortOrder: 4 },
  { id: "fruit-grape", name: "葡萄", parentId: "cat-fruit", sortOrder: 5 },
  { id: "fruit-peach", name: "桃子", parentId: "cat-fruit", sortOrder: 6 },
  // 厨具类
  { id: "kit-board", name: "木质砧板", parentId: "cat-kitchen", sortOrder: 1 },
  { id: "kit-plate", name: "陶瓷餐盘", parentId: "cat-kitchen", sortOrder: 2 },
  { id: "kit-pot", name: "不锈钢锅", parentId: "cat-kitchen", sortOrder: 3 },
  { id: "kit-woodtool", name: "木质厨具", parentId: "cat-kitchen", sortOrder: 4 },
  { id: "kit-jar", name: "玻璃储物罐", parentId: "cat-kitchen", sortOrder: 5 },
];

/** 标签 */
export const seedTags: Tag[] = [
  { id: "tag-texture", name: "质感增强" },
  { id: "tag-material", name: "材质" },
  { id: "tag-prop", name: "道具" },
  { id: "tag-fruit", name: "水果" },
  { id: "tag-kitchen", name: "厨具" },
];

const DAY = 24 * 60 * 60 * 1000;

// 通用标签组
const T_TEXTURE = ["tag-texture"];

/** 构造单条提示词 */
function mk(
  index: number,
  p: Pick<Prompt, "id" | "code" | "title" | "categoryId" | "subcategoryId" | "content"> & {
    favorite?: boolean;
    usageCount?: number;
    lastUsedDaysAgo?: number;
    note?: string;
    tagIds?: string[];
  },
): Prompt {
  const createdAt = BASE + index * 1000;
  const now = createdAt + index * 1000;
  return {
    favorite: false,
    usageCount: 0,
    ...p,
    tags: p.tagIds ?? T_TEXTURE,
    note: p.note,
    lastUsedAt:
      p.lastUsedDaysAgo != null ? BASE + (30 - p.lastUsedDaysAgo) * DAY : undefined,
    createdAt,
    updatedAt: now,
  };
}

/** 29 条提示词（已从 Excel 解析并去重） */
export const seedPrompts: Prompt[] = [
  // —— 材质类 10 条 ——
  mk(1, {
    id: "p-m-01", code: "01", title: "天然木材", categoryId: "cat-material", subcategoryId: "mat-wood",
    content: "增强真实天然木材质感，表现自然木纹、木纤维、细微毛孔、天然色差和真实纹理层次；木纹方向严格遵循原产品结构和加工方向，不生成新的木纹。保留真实木材的哑光或半哑光反射，使表面具有真实家具摄影质感。",
    usageCount: 9, lastUsedDaysAgo: 3, tagIds: ["tag-texture", "tag-material"],
    note: "适用于木质家具主体，木纹方向需与产品结构一致。",
  }),
  mk(2, {
    id: "p-m-02", code: "02", title: "木皮 / Veneer", categoryId: "cat-material", subcategoryId: "mat-veneer",
    content: "增强真实天然木皮纹理，表现细密连续的木纹、自然纹理变化和真实木材纤维；保持木皮纹理与家具结构、拼接方向完全一致，增强真实细节但避免过度锐化、重复纹理和CG木材效果。",
    usageCount: 5, lastUsedDaysAgo: 7, tagIds: ["tag-texture", "tag-material"],
  }),
  mk(3, {
    id: "p-m-03", code: "03", title: "布艺 / 亚麻", categoryId: "cat-material", subcategoryId: "mat-fabric",
    content: "增强真实布艺纤维质感，表现清晰但自然的经纬纱线、织物纤维、细微绒感和真实织物颗粒；保留原有颜色、纹理方向、褶皱和受光关系，使面料具有真实纺织品摄影质感，避免塑料感和过度锐化。",
    favorite: true, usageCount: 12, lastUsedDaysAgo: 1, tagIds: ["tag-texture", "tag-material"],
    note: "适用于沙发/窗帘面料，搭配「金属」「大理石」组合使用效果佳。",
  }),
  mk(4, {
    id: "p-m-04", code: "04", title: "绒布 / 灯芯绒", categoryId: "cat-material", subcategoryId: "mat-flannel",
    content: "增强真实绒布纤维和绒面结构，表现细密绒毛、纤维方向、柔和漫反射和自然明暗变化；灯芯绒保持真实条纹起伏和绒毛方向，避免表面变得过度光滑或像数字贴图。",
    tagIds: ["tag-texture", "tag-material"],
  }),
  mk(5, {
    id: "p-m-05", code: "05", title: "皮革", categoryId: "cat-material", subcategoryId: "mat-leather",
    content: "增强真实天然皮革质感，表现细微皮革纹理、自然毛孔、柔软褶皱、轻微色差和真实皮面颗粒；根据原皮革类型保留自然哑光或半光泽反射，避免塑料皮、橡胶感和过度均匀的纹理。",
    tagIds: ["tag-texture", "tag-material"],
  }),
  mk(6, {
    id: "p-m-06", code: "06", title: "大理石", categoryId: "cat-material", subcategoryId: "mat-marble",
    content: "增强真实天然大理石质感，表现自然石材颗粒、细微孔隙、真实矿物纹理和自然不规则纹路；保持原有石纹走向和颜色不变，不生成新的纹路。增强真实石材的重量感、微弱反射和自然光影层次，避免CG材质。",
    tagIds: ["tag-texture", "tag-material"],
  }),
  mk(7, {
    id: "p-m-07", code: "07", title: "玻璃", categoryId: "cat-material", subcategoryId: "mat-glass",
    content: "增强真实玻璃材质，表现自然透明度、玻璃厚度、边缘折射、环境反射和柔和高光；保持玻璃真实的光学特性，边缘清晰但不过度锐利，避免纯透明、塑料感、CG感和人工描边。",
    tagIds: ["tag-texture", "tag-material"],
  }),
  mk(8, {
    id: "p-m-08", code: "08", title: "金属", categoryId: "cat-material", subcategoryId: "mat-metal",
    content: "增强真实金属材质，表现细微金属颗粒、拉丝纹理、真实环境反射和自然高光；根据原始金属类型保持真实的反射强度和粗糙度，使高光过渡自然、金属厚重感真实，避免镜面塑料感和3D渲染效果。",
    tagIds: ["tag-texture", "tag-material"],
  }),
  mk(9, {
    id: "p-m-09", code: "09", title: "藤编 / 藤条", categoryId: "cat-material", subcategoryId: "mat-rattan",
    content: "增强真实天然藤编材质，表现清晰自然的藤条纤维、编织结构、细微粗糙度和真实交错关系；保持原有编织方向、间距和结构不变，增加自然色差和轻微不规则性，避免纹理复制、重复图案和AI生成感。",
    tagIds: ["tag-texture", "tag-material"],
  }),
  mk(10, {
    id: "p-m-10", code: "10", title: "石材 / 岩板", categoryId: "cat-material", subcategoryId: "mat-stone",
    content: "增强真实石材 / 岩板质感，表现细微矿物颗粒、自然纹理、真实粗糙度和微弱表面反射；保持原始纹理走向、颜色和结构不变，增强石材厚度和重量感，避免纹理过于规则、过度锐利和CG渲染效果。",
    tagIds: ["tag-texture", "tag-material"],
  }),

  // —— 道具类 8 条 ——
  mk(11, {
    id: "p-p-01", code: "01", title: "玻璃杯", categoryId: "cat-prop", subcategoryId: "prop-glass",
    content: "增强真实透明玻璃材质，表现自然玻璃厚度、边缘高光、透明度变化、真实折射和环境反射；玻璃边缘清晰但不过度锐化，内部透光自然，保留轻微真实光线变化。避免CG玻璃、人工描边、过度锐利高光和塑料透明感。",
    usageCount: 7, lastUsedDaysAgo: 2, tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(12, {
    id: "p-p-02", code: "02", title: "陶瓷花瓶", categoryId: "cat-prop", subcategoryId: "prop-vase",
    content: "增强真实陶瓷材质，表现细微陶土颗粒、釉面纹理和自然不均匀性；加强真实柔和反射、漫反射和局部高光，使表面具有真实陶瓷的细腻厚重感。保留原有颜色、形状和光影，避免表面过度光滑和3D渲染感。",
    tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(13, {
    id: "p-p-03", code: "03", title: "金属摆件", categoryId: "cat-prop", subcategoryId: "prop-ornament",
    content: "增强真实金属材质，表现细微金属纹理、真实反射、高光过渡和环境光反射；高光具有真实金属特有的锐利程度，同时保留自然柔和的明暗渐变。去除CG金属感和塑料感，保持原有材质颜色、形态和光线方向。",
    tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(14, {
    id: "p-p-04", code: "04", title: "书籍", categoryId: "cat-prop", subcategoryId: "prop-book",
    content: "增强真实纸张和书籍材质，表现细微纸张纤维、自然纸张颗粒、书页厚度和轻微边缘不规则；封面保持真实印刷质感，避免过度锐利和数字生成感。保留书籍原有大小、位置、颜色和文字内容不变。",
    tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(15, {
    id: "p-p-05", code: "05", title: "玻璃花瓶", categoryId: "cat-prop", subcategoryId: "prop-gvase",
    content: "增强透明玻璃花瓶真实质感，表现玻璃厚度、边缘折射、自然反射和透明度变化；内部植物通过玻璃产生自然轻微折射和视觉变化，玻璃表面保留真实环境反射。避免纯透明、CG玻璃和人工描边。",
    tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(16, {
    id: "p-p-06", code: "06", title: "蜡烛", categoryId: "cat-prop", subcategoryId: "prop-candle",
    content: "增强真实蜡烛材质，表现细腻蜡质颗粒、自然哑光表面、轻微不规则边缘和真实融蜡痕迹；蜡烛表面保留自然柔和光影，火焰产生真实暖色微光和自然光照衰减，避免塑料感和过度完美。",
    favorite: true, usageCount: 4, lastUsedDaysAgo: 5, tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(17, {
    id: "p-p-07", code: "07", title: "干花 / 干枝", categoryId: "cat-prop", subcategoryId: "prop-dried",
    content: "增强真实干燥植物材质，表现枝条天然纤维、细小纹理、轻微弯曲和自然干燥状态；花朵和枝叶保留真实的不规则形态、自然颜色变化和细微阴影，避免植物表面过度光滑或AI生成感。",
    tagIds: ["tag-texture", "tag-prop"],
  }),
  mk(18, {
    id: "p-p-08", code: "08", title: "果盘 / 装饰盘", categoryId: "cat-prop", subcategoryId: "prop-tray",
    content: "增强真实陶瓷 / 木质 / 金属果盘材质，根据原图材质表现自然纹理、细微颗粒、真实反射和边缘细节；保留轻微手工制作的不规则性和真实光影，使其具有真实家居摄影中的使用质感。",
    tagIds: ["tag-texture", "tag-prop"],
  }),

  // —— 水果类 6 条 ——
  mk(19, {
    id: "p-f-01", code: "01", title: "柠檬", categoryId: "cat-fruit", subcategoryId: "fruit-lemon",
    content: "增强真实新鲜柠檬的天然果皮质感，增加细密自然的果皮毛孔、微小凹凸、细微颗粒和真实表皮纹理；保留自然的黄色色差、轻微形态不规则和真实明暗变化。增强柔和自然的果皮高光和漫反射，使表面具有真实水果摄影质感，避免过度光滑、蜡质感和塑料感。保留原有形状、大小、数量、位置和光影。",
    favorite: true, usageCount: 6, lastUsedDaysAgo: 4, tagIds: ["tag-texture", "tag-fruit"],
  }),
  mk(20, {
    id: "p-f-02", code: "02", title: "橙子", categoryId: "cat-fruit", subcategoryId: "fruit-orange",
    content: "增强真实橙子的天然粗糙果皮纹理，表现细密毛孔、颗粒感、微小凹凸和自然橙皮起伏；增加真实的色彩层次和细微明暗变化，保留自然果皮的轻微不均匀性。高光柔和、反射自然，呈现真实摄影中的新鲜橙子质感，避免表面过度光滑和人工3D渲染感。",
    usageCount: 3, lastUsedDaysAgo: 6, tagIds: ["tag-texture", "tag-fruit"],
  }),
  mk(21, {
    id: "p-f-03", code: "03", title: "苹果", categoryId: "cat-fruit", subcategoryId: "fruit-apple",
    content: "增强真实苹果的天然果皮质感，表现细腻但清晰的果皮纹理、微小斑点、细微色差和自然不规则变化；加强苹果表面真实的漫反射和柔和高光，体现自然果蜡层次但不过度光滑。保留原有颜色、形态、大小和光影，呈现真实商业静物摄影质感。",
    tagIds: ["tag-texture", "tag-fruit"],
  }),
  mk(22, {
    id: "p-f-04", code: "04", title: "梨", categoryId: "cat-fruit", subcategoryId: "fruit-pear",
    content: "增强真实梨子的细腻颗粒状果皮纹理，表现天然微小斑点、细微凹凸和自然色彩渐变；保留梨子成熟水果特有的柔和哑光质感和自然不规则性，加强真实光线下的明暗过渡和柔和高光，避免塑料感和AI生成感。",
    tagIds: ["tag-texture", "tag-fruit"],
  }),
  mk(23, {
    id: "p-f-05", code: "05", title: "葡萄", categoryId: "cat-fruit", subcategoryId: "fruit-grape",
    content: "增强真实葡萄的半透明果皮质感，表现自然果粉、细微表皮纹理、真实水分感和柔和高光；不同葡萄之间保留轻微颜色、亮度和大小差异，增强真实的果实层次和自然接触关系。避免所有葡萄过度规则、过度光滑或呈现玻璃珠质感。",
    tagIds: ["tag-texture", "tag-fruit"],
  }),
  mk(24, {
    id: "p-f-06", code: "06", title: "桃子", categoryId: "cat-fruit", subcategoryId: "fruit-peach",
    content: "增强真实桃子的柔软绒毛质感，表现细密自然的绒毛、细微表皮颗粒、自然色彩渐变和真实成熟水果的柔和质感；增加自然漫反射和柔和高光，保持桃子原有形态和颜色，避免表面变成塑料、橡胶或过度光滑材质。",
    tagIds: ["tag-texture", "tag-fruit"],
  }),

  // —— 厨具类 5 条 ——
  mk(25, {
    id: "p-k-01", code: "01", title: "木质砧板", categoryId: "cat-kitchen", subcategoryId: "kit-board",
    content: "增强真实天然木材纹理，表现细密木纤维、自然木纹、轻微色差、细小刀痕和真实使用痕迹；保留木材天然孔隙和哑光质感，加强真实光线下的纹理层次，避免纹理过度规则和CG木材效果。",
    tagIds: ["tag-texture", "tag-kitchen"],
  }),
  mk(26, {
    id: "p-k-02", code: "02", title: "陶瓷餐盘", categoryId: "cat-kitchen", subcategoryId: "kit-plate",
    content: "增强真实陶瓷餐盘质感，表现细微釉面颗粒、陶瓷厚度、边缘细节和自然柔和反射；保留真实陶瓷的轻微不均匀性和手工质感，避免表面过度光滑、塑料感和3D渲染感。",
    tagIds: ["tag-texture", "tag-kitchen"],
  }),
  mk(27, {
    id: "p-k-03", code: "03", title: "不锈钢锅 / 锅具", categoryId: "cat-kitchen", subcategoryId: "kit-pot",
    content: "增强真实不锈钢材质，表现细密拉丝纹理、真实金属反射、环境倒影和自然高光过渡；保持金属表面的微小不规则反射，避免镜面过度完美。强化真实金属厚度和边缘高光，呈现高端厨具商业摄影质感。",
    usageCount: 2, lastUsedDaysAgo: 8, tagIds: ["tag-texture", "tag-kitchen"],
  }),
  mk(28, {
    id: "p-k-04", code: "04", title: "木质厨具", categoryId: "cat-kitchen", subcategoryId: "kit-woodtool",
    content: "增强木质厨具真实木材纹理，表现天然木纤维、细微毛孔、自然色差和轻微使用痕迹；保持木材哑光质感和自然边缘，避免纹理重复、过度锐利和AI生成的规则木纹。",
    tagIds: ["tag-texture", "tag-kitchen"],
  }),
  mk(29, {
    id: "p-k-05", code: "05", title: "玻璃储物罐", categoryId: "cat-kitchen", subcategoryId: "kit-jar",
    content: "增强真实透明玻璃质感，表现玻璃厚度、边缘折射、自然反射和透明度变化；罐体内部物品通过玻璃产生真实视觉层次，保持玻璃干净通透，同时具有自然环境反射，避免CG透明材质和塑料感。",
    tagIds: ["tag-texture", "tag-kitchen"],
  }),
];
