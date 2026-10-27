// 产品宣传专用示例。与账号课程、业务题库及默认登录数据完全独立，不提交到后端。
export const productNodes = [
  {
    id: "product-vector",
    label: "向量",
    x: 95,
    y: 165,
    description: "从一个向量出发，理解它怎样被变换。",
    quote: "用一组有序的数，描述方向与长度。",
  },
  {
    id: "product-matrix",
    label: "矩阵",
    x: 275,
    y: 85,
    description: "把线性变换写成可以计算的形式。",
    quote: "矩阵与向量相乘，得到变换后的向量。",
  },
  {
    id: "product-transform",
    label: "线性变换",
    x: 480,
    y: 165,
    description: "观察一次变换，怎样改变向量。",
    quote: "保持加法与数乘结构，是线性变换的基本性质。",
  },
  {
    id: "product-eigen",
    label: "特征值",
    x: 665,
    y: 85,
    description: "找到变换中，那些特别的方向。",
    quote: "Av = λv，v ≠ 0：变换后仍在同一条直线上。",
  },
];
export const productEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [1, 3],
];
export const productSteps = [
  {
    name: "资料归位",
    title: "从一份讲义开始。",
    text: "把 PDF、讲义和笔记放进课程。下次打开，学习从上次停下的地方继续。",
    icon: "file",
    detail: "课程与资料，一起保存",
  },
  {
    name: "连接知识",
    title: "把理解，连成自己的线。",
    text: "手动整理知识点，连接先后关系。你决定学习的顺序，也看得见知识之间的联系。",
    icon: "graph",
    detail: "知识点和关系，由你配置",
  },
  {
    name: "带着问题读",
    title: "一个问题，回到原文。",
    text: "围绕课程资料提问，结合引用核对解释。让答案有出处，让阅读更深入。",
    icon: "spark",
    detail: "资料答疑，保留引用依据",
  },
  {
    name: "练习与复习",
    title: "让看懂，走向会用。",
    text: "用自己的题库检验理解。看解析、整理错题，再为下一次复习留一个位置。",
    icon: "calendar",
    detail: "从一次作答，到下一步行动",
  },
];
