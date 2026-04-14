export const formSections = [
  {
    id: "basic",
    title: "A. 基础信息",
    description: "先确认孩子目前所处的位置和身份条件。",
    fields: [
      {
        name: "studentName",
        label: "孩子昵称",
        type: "text",
        placeholder: "方便顾问称呼，例如：Mia",
        required: true
      },
      {
        name: "grade",
        label: "孩子当前年级",
        type: "radio",
        required: true,
        options: [
          ["kindergarten", "幼儿园"],
          ["g1-g3", "小学 1-3 年级"],
          ["g4-g6", "小学 4-6 年级"],
          ["g7-g9", "初中 7-9 年级"],
          ["g10-g12", "高中 10-12 年级"]
        ]
      },
      {
        name: "location",
        label: "当前所在城市 / 地区",
        type: "text",
        placeholder: "例如：深圳、上海、杭州",
        required: true
      },
      {
        name: "currentSchoolType",
        label: "当前学校类型",
        type: "radio",
        required: true,
        options: [
          ["public", "公立学校"],
          ["private", "民办学校"],
          ["bilingual", "双语学校"],
          ["international", "国际学校"],
          ["other", "其他"]
        ]
      },
      {
        name: "hkIdentity",
        label: "是否已有香港身份 / 明确身份规划",
        type: "radio",
        required: true,
        help: "这会影响可走路径和切入节奏。",
        options: [
          ["yes", "已有香港身份"],
          ["planning", "正在规划身份"],
          ["no", "暂时没有"]
        ]
      }
    ]
  },
  {
    id: "ability",
    title: "B. 学业与语言",
    description: "这一部分决定孩子切入不同学校路径的可行性。",
    fields: [
      {
        name: "academicLevel",
        label: "最近成绩水平",
        type: "radio",
        required: true,
        options: [
          ["top", "前 10%-15%"],
          ["upper", "中上水平"],
          ["middle", "中等水平"],
          ["lower", "暂时偏弱"]
        ]
      },
      {
        name: "englishLevel",
        label: "英语基础 / 英文学习情况",
        type: "radio",
        required: true,
        options: [
          ["strong", "能较顺畅学习英文内容"],
          ["good", "基础不错，可继续强化"],
          ["basic", "有基础但不稳定"],
          ["weak", "目前较弱，需系统补足"]
        ]
      },
      {
        name: "subjectRisk",
        label: "是否有明显偏科或薄弱项",
        type: "radio",
        required: true,
        options: [
          ["none", "没有明显偏科"],
          ["minor", "有轻微短板"],
          ["major", "有明显薄弱项"]
        ]
      },
      {
        name: "selfDrive",
        label: "学习习惯 / 自驱力自评",
        type: "radio",
        required: true,
        options: [
          ["high", "自驱力强"],
          ["medium", "需要适度推动"],
          ["low", "比较依赖家长督促"]
        ]
      }
    ]
  },
  {
    id: "goal",
    title: "C. 升学目标与意向",
    description: "这里帮助我们判断家庭真实目标和推进窗口。",
    fields: [
      {
        name: "motivation",
        label: "为什么考虑香港读书",
        type: "textarea",
        placeholder: "例如：希望改善英语环境、升学路径更清晰、计划家庭转港等",
        required: true
      },
      {
        name: "preferredPath",
        label: "目前更关注哪条路径",
        type: "radio",
        required: true,
        options: [
          ["local", "香港本地学校"],
          ["international", "国际学校"],
          ["bilingual", "双语 / 过渡路径"],
          ["unsure", "暂时不清楚"]
        ]
      },
      {
        name: "timeline",
        label: "希望何时切入香港",
        type: "radio",
        required: true,
        options: [
          ["urgent", "3 个月内 / 越快越好"],
          ["year", "1 年内"],
          ["two-years", "2 年内"],
          ["explore", "先了解，不急"]
        ]
      },
      {
        name: "transitionAcceptance",
        label: "是否接受插班 / 转轨 / 过渡方案",
        type: "radio",
        required: true,
        options: [
          ["yes", "可以接受"],
          ["maybe", "视方案而定"],
          ["no", "尽量不接受"]
        ]
      }
    ]
  },
  {
    id: "family",
    title: "D. 家庭条件与约束",
    description: "预算和家庭安排会直接影响建议路径。",
    fields: [
      {
        name: "budget",
        label: "可接受年教育预算",
        type: "radio",
        required: true,
        options: [
          ["under-80k", "8 万以下"],
          ["80k-150k", "8-15 万"],
          ["150k-300k", "15-30 万"],
          ["300k-plus", "30 万以上"]
        ]
      },
      {
        name: "residencyFlex",
        label: "是否可接受租房 / 陪读 / 跨境通勤",
        type: "radio",
        required: true,
        options: [
          ["full", "可以灵活安排"],
          ["partial", "可接受部分安排"],
          ["low", "家庭限制较多"]
        ]
      },
      {
        name: "parentPriority",
        label: "家长最看重什么",
        type: "radio",
        required: true,
        options: [
          ["academic", "学术与升学结果"],
          ["identity", "身份与长期规划"],
          ["language", "英语环境与国际化"],
          ["balance", "综合平衡与适应"]
        ]
      },
      {
        name: "biggestConcern",
        label: "最大顾虑是什么",
        type: "radio",
        required: true,
        options: [
          ["cost", "成本压力"],
          ["adaptation", "适应与融入"],
          ["competition", "竞争与录取难度"],
          ["identity", "身份因素"],
          ["timing", "时间窗口"],
          ["unclear", "信息太杂，不知道怎么判断"]
        ]
      }
    ]
  },
  {
    id: "contact",
    title: "E. 咨询意愿与联系方式",
    description: "提交后你会拿到初步结果，我们也会按你选择的方式安排顾问跟进。",
    fields: [
      {
        name: "consultationIntent",
        label: "是否希望顾问进一步分析",
        type: "radio",
        required: true,
        options: [
          ["high", "希望尽快联系我"],
          ["medium", "可以进一步聊聊"],
          ["low", "先看结果，再决定"]
        ]
      },
      {
        name: "contactName",
        label: "家长称呼",
        type: "text",
        placeholder: "例如：陈女士",
        required: true
      },
      {
        name: "contactMethod",
        label: "主要联系方式（手机号 / 微信）",
        type: "text",
        placeholder: "例如：13800000000 / wechat_id",
        required: true
      },
      {
        name: "contactWindow",
        label: "方便联系时间",
        type: "radio",
        required: true,
        options: [
          ["workday", "工作日白天"],
          ["evening", "工作日晚间"],
          ["weekend", "周末"],
          ["flexible", "均可"]
        ]
      },
      {
        name: "sourceChannel",
        label: "你是从哪里看到我们的",
        type: "radio",
        required: true,
        options: [
          ["xiaohongshu", "小红书"],
          ["wechat", "朋友圈 / 微信群"],
          ["friend", "朋友转介绍"],
          ["content", "公众号 / 内容平台"],
          ["other", "其他"]
        ]
      }
    ]
  }
];

export const optionLabelMap = formSections.reduce((acc, section) => {
  section.fields.forEach((field) => {
    if (!field.options) {
      return;
    }

    acc[field.name] = Object.fromEntries(field.options);
  });

  return acc;
}, {});

export function getFieldLabel(fieldName) {
  for (const section of formSections) {
    const match = section.fields.find((field) => field.name === fieldName);
    if (match) {
      return match.label;
    }
  }

  return fieldName;
}

export function getOptionLabel(fieldName, value) {
  return optionLabelMap[fieldName]?.[value] ?? value ?? "未填写";
}

export const requiredFieldNames = formSections.flatMap((section) =>
  section.fields.filter((field) => field.required).map((field) => field.name)
);
