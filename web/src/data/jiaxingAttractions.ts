export type JiaxingAttraction = {
  id: string;
  index: string;
  name: string;
  district: string;
  position: [number, number];
  coordinates: string;
  accent: string;
  short: string;
  summary: string;
  duration: string;
  bestTime: string;
  highlights: string[];
  tips: string[];
};

export const JIAXING_ATTRACTIONS: JiaxingAttraction[] = [
  {
    id: "nanhu",
    index: "01",
    name: "南湖",
    district: "南湖区",
    position: [0.3, 2.1],
    coordinates: "30.744°N, 120.766°E",
    accent: "#bb4e36",
    short: "湖心岛、烟雨楼与红船",
    summary:
      "嘉兴最具辨识度的城市水景。湖心岛、烟雨楼与红船共同构成一段可以乘船进入的历史现场。",
    duration: "3-5 小时",
    bestTime: "清晨或荷花季",
    highlights: ["乘船登湖心岛", "烟雨楼远眺", "红船与南湖革命纪念馆"],
    tips: [
      "先看船班时刻，再安排纪念馆与湖边步行。",
      "夏季荷花盛开，清晨光线更柔，也更适合拍照。",
      "湖边风雨变化快，轻便雨具比厚重外套更实用。",
    ],
  },
  {
    id: "yuehe",
    index: "02",
    name: "月河历史街区",
    district: "南湖区",
    position: [-0.5, 0.35],
    coordinates: "30.762°N, 120.741°E",
    accent: "#c9833f",
    short: "水巷、古桥与嘉兴夜生活",
    summary:
      "贴着老城生长的水乡街区，河道、石桥、骑楼与小吃铺密集，适合把嘉兴当作一顿慢晚餐来体验。",
    duration: "1.5-3 小时",
    bestTime: "傍晚亮灯后",
    highlights: ["月河古街", "嘉兴粽子文化博物馆", "水巷石桥夜景"],
    tips: [
      "下午先逛街区，亮灯后再沿河走一圈，层次最好。",
      "鲜肉粽、蛋黄粽适合分食，不要把主餐一次性吃满。",
      "节假日晚间人流集中，带小朋友时尽量避开桥口停留。",
    ],
  },
  {
    id: "wuzhen",
    index: "03",
    name: "乌镇",
    district: "桐乡市",
    position: [-6.1, -0.6],
    coordinates: "30.745°N, 120.491°E",
    accent: "#326f76",
    short: "东栅市井、西栅夜色与木心美术馆",
    summary:
      "从传统水乡生活到当代艺术与戏剧节，乌镇把江南古镇的日常和新的文化叙事放在同一条河上。",
    duration: "1-2 天",
    bestTime: "住西栅才能看到清晨与夜游",
    highlights: ["西栅夜游", "草木本色染坊", "木心美术馆"],
    tips: [
      "如果只来半天，优先西栅；想看完整体验，住景区内更从容。",
      "西栅夜景是重点，但清晨开门前的水巷更安静。",
      "美术馆与热门展馆常有临时安排，出发前查看当天开放信息。",
    ],
  },
  {
    id: "xitang",
    index: "04",
    name: "西塘古镇",
    district: "嘉善县",
    position: [5.9, -2.1],
    coordinates: "30.947°N, 120.896°E",
    accent: "#9b643e",
    short: "烟雨长廊、石皮弄与摇橹船",
    summary:
      "廊棚把细雨和烈日都挡在生活之外，西塘的好看不在宏大，而在一段段贴着水面的旧街和窄巷。",
    duration: "半天-1 天",
    bestTime: "清晨或小雨天",
    highlights: ["烟雨长廊", "石皮弄", "送子来凤桥"],
    tips: [
      "雨天不是坏天气，廊棚下反而更有西塘的味道。",
      "中午后旅行团增多，拍照与慢逛尽量放到早上。",
      "坐船建议先看码头排队情况，再决定是否购买联票。",
    ],
  },
  {
    id: "puyuan",
    index: "05",
    name: "濮院时尚古镇",
    district: "桐乡市",
    position: [-3.6, 1.35],
    coordinates: "30.638°N, 120.605°E",
    accent: "#b08a55",
    short: "古镇骨架与现代时尚产业",
    summary:
      "濮院不只是复刻水乡，它把毛衫、丝绸、时尚展陈和古镇夜游放在一起，气质比传统古镇更当代。",
    duration: "3-5 小时",
    bestTime: "下午入镇，留到夜景",
    highlights: ["福善寺片区", "古镇水街", "夜间灯影与展演"],
    tips: [
      "建筑与商业空间较新，适合把它当作轻松的城市度假。",
      "先走水街再看夜景，能感受到空间表情的变化。",
      "镇外住宿通常更灵活，节假日提前确认接驳与停车。",
    ],
  },
  {
    id: "yanguan",
    index: "06",
    name: "盐官古城",
    district: "海宁市",
    position: [2.1, 6.2],
    coordinates: "30.405°N, 120.548°E",
    accent: "#4f8791",
    short: "一线潮、古塔与海宁人文",
    summary:
      "钱塘江在这里把潮水推成一条白色长线。观潮之外，占鳌塔、海神庙和王国维故居让古城有了更厚的文化层。",
    duration: "半天-1 天",
    bestTime: "按潮汐表倒推 1-2 小时",
    highlights: ["观潮胜地公园", "占鳌塔", "海神庙与王国维故居"],
    tips: [
      "潮水不是固定时间出现，出发前必须确认当日潮汐。",
      "提前到达并站进安全区域，不要越过警戒线追潮。",
      "观潮之外至少留 2 小时给古城，才不会只看到一场水。",
    ],
  },
  {
    id: "nanbei-lake",
    index: "07",
    name: "南北湖",
    district: "海盐县",
    position: [6.6, 6.6],
    coordinates: "30.392°N, 120.869°E",
    accent: "#557d62",
    short: "湖、山、海三种景观互相借景",
    summary:
      "山不高、湖不喧闹，却能同时看到海与田园。这里最适合把行程放慢，用半天去走一段山路。",
    duration: "半天-1 天",
    bestTime: "清晨登高或晴朗傍晚",
    highlights: ["鹰窠顶远眺", "白鹭洲", "谈仙石城"],
    tips: [
      "山路与湖岸温差明显，轻外套和防滑鞋很实用。",
      "想看日出要提前查天气与日出时间，阴天优先湖岸线。",
      "景区范围分散，先确定主入口和回程方式再进山。",
    ],
  },
  {
    id: "meihuazhou",
    index: "08",
    name: "梅花洲",
    district: "南湖区",
    position: [3.7, 3.35],
    coordinates: "30.734°N, 120.844°E",
    accent: "#8b7b4c",
    short: "古桥、寺院与一棵大银杏",
    summary:
      "水网把村落分成几块轻巧的洲岛，寺院、石桥和古银杏串起一条不急着赶路的田园水乡线。",
    duration: "3-4 小时",
    bestTime: "春季或银杏黄时",
    highlights: ["石佛寺", "三步两爿桥", "古银杏与田园水岸"],
    tips: [
      "春季看花、深秋看银杏，季节比打卡速度更重要。",
      "亲子游适合把寺院、桥和水岸拆成短段慢慢走。",
      "园区较开阔，夏天备好遮阳与饮水。",
    ],
  },
  {
    id: "jiulongshan",
    index: "09",
    name: "九龙山",
    district: "平湖市",
    position: [8.7, 4.15],
    coordinates: "30.635°N, 121.139°E",
    accent: "#3d7480",
    short: "山林、海风和乍浦的海岸线",
    summary:
      "嘉兴的东南尽头，山体向海面收束。这里适合用一条轻松的度假线，把山林、海风和港城轮廓一起看完。",
    duration: "半天-1 天",
    bestTime: "晴天傍晚",
    highlights: ["山林步道", "海堤观景", "乍浦港城远眺"],
    tips: [
      "海边风大，帽子和轻薄衣物要注意固定。",
      "部分区域受天气和景区管理影响，现场以开放公告为准。",
      "傍晚返程尽量避开集中车流，预留交通时间。",
    ],
  },
];

export const JIAXING_ATTRACTION_BY_ID = Object.fromEntries(
  JIAXING_ATTRACTIONS.map((attraction) => [attraction.id, attraction]),
) as Record<string, JiaxingAttraction>;
