# 中文站写作规范

中文页面写给中文读者读，不是把英文逐句搬过来。先弄懂这一段要说什么，再用中文的习惯重新说一遍；可以调整语序、拆句、并句、删掉中文里多余的连接词。读起来要像国内高校实验室自己写的主页和技术博客：平实、准确、有信息量。

## 避免翻译腔

- 少用"被"字句，能用主动就用主动。
- 不写"进行 + 动词"（进行训练 → 训练；对……进行评估 → 评估……）。
- 少用"一个""一种""其""该"。英文冠词不用翻出来。
- 长定语拆开：不要"一个能够在……中……的……的框架"，改成两句。
- "基于……的""通过……来""使得""从而"不要成串出现。
- 英文的被动和名词化结构，中文里改回动词。
- 不照搬英文标点和句式：中文用全角标点（，。：；？！""（））；破折号少用，一般改成逗号、冒号或拆句。

## 避免 AI 味和宣传腔

不要用：赋能、助力、打造、深耕、旨在、致力于（必要时可用一次）、全方位、无缝、极致、颠覆、引领、开启……新篇章、值得注意的是、此外（句首滥用）、总而言之、综上所述、不仅……更……、在……的浪潮中、让我们、一起探索。

不要排比口号，不要三连形容词，不要在结尾加总结拔高的句子。事实和数字照原文写，不夸大，不加原文没有的内容。

## 格式

- 中文和英文、数字之间加一个半角空格：在 GUI 智能体上训练 3 个模型。中文标点前后不加空格。
- 数字、公式、代码、模型名、基准名、方法名、人名、会议名保持原样（GRPO、WorldMemBench、EMNLP 2026、Qwen3-8B）。
- 所有 HTML 标签和属性原样保留，只改可见文字；链接位置可以随语序移动，但链接本身（href）不能改。

## 术语表

| English | 中文 |
| :-- | :-- |
| reasoning | 推理 |
| embodied AI / embodied intelligence | 具身智能 |
| agentic AI | 智能体（Agentic AI），一般直接写"智能体" |
| agent | 智能体 |
| lifelong learning / lifelong-learning AI | 终身学习 |
| GUI agent | GUI 智能体 |
| computer-use agent (CUA) | 电脑操作智能体（Computer-Use Agent） |
| deep research agent | 深度研究智能体 |
| world model | 世界模型 |
| spatial intelligence / spatial reasoning | 空间智能 / 空间推理 |
| benchmark | 评测基准（上下文清楚时可写"基准"） |
| reinforcement learning (RL) | 强化学习（RL） |
| post-training | 后训练 |
| alignment | 对齐 |
| reward / reward model | 奖励 / 奖励模型 |
| policy | 策略 |
| rollout | rollout（保留英文） |
| on-policy / off-policy | on-policy / off-policy（保留英文） |
| self-distillation | 自蒸馏 |
| (activation) steering | 激活干预；steering vector → 干预向量 |
| grounding (GUI) | 定位（GUI grounding → GUI 元素定位） |
| open source / open-source | 开源 |
| paper / code / project page | 论文 / 代码 / 项目主页 |
| PhD student / master's student / undergraduate | 博士生 / 硕士生 / 本科生 |
| Principal Investigator | 课题组负责人 |
| REAL Lab | REAL Lab（不翻） |
| Zhejiang University | 浙江大学 |
