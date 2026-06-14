library(dplyr)
library(stringr)

data1 <- read.csv("C:/Users/user/Desktop/大數據與社會分析/專案/全年出國旅次.csv")
data2 <- read.csv("C:/Users/user/Desktop/大數據與社會分析/專案/全年旅客.csv")

# 因為 vb 欄位一樣，所以刪掉 data1 的 vb 欄位，保留 data2 的 vb 欄位
data1_clean <- data1 %>%
  select(-starts_with("vb"))

data <- data1_clean %>%
  inner_join(
    data2,
    by = c("vcaseid", "season", "no")
  )

# variables needed
data_new <- data %>%
  select(
    vcaseid,
    season,
    no,
    outtrip_no,
    vq18,
    vq23_1:vq23_10,
    vq24,
    vq26,
    vq29,
    vb1,
    vb5
  ) %>%
  distinct()

# notes
attr(data_new$vq18, "label") <- "影響您本季出國旅遊意願最主要的原因為"

for (i in 1:10) {
  attr(data_new[[paste0("vq23_", i)]], "label") <- paste0("旅行目的地_", i)
}

attr(data_new$vq24, "label") <- "旅遊目的"
attr(data_new$vq26, "label") <- "出國安排"
attr(data_new$vq29, "label") <- "出國總花費"
attr(data_new$vb1,  "label") <- "年齡"
attr(data_new$vb5,  "label") <- "每人每月平均所得"


#### 圖表 ####
library(dplyr)
library(tidyr)
library(ggplot2)
library(forcats)
library(scales)

# =========================
# 1. Label dictionaries
# =========================

vq24_labels <- c(
  "1" = "Leisure / Vacation",
  "2" = "Business Trip",
  "3" = "Visiting Relatives or Friends",
  "4" = "Medical Treatment",
  "5" = "Short-term Study",
  "65" = "Other"
)

vq23_labels <- c(
  "1" = "Hong Kong",
  "2" = "China",
  "3" = "Macau",
  "4" = "Thailand",
  "5" = "Malaysia",
  "6" = "Singapore",
  "7" = "Indonesia",
  "8" = "Philippines",
  "9" = "Vietnam",
  "10" = "Cambodia",
  "11" = "Myanmar",
  "12" = "Japan",
  "13" = "South Korea",
  "14" = "India",
  "15" = "United States",
  "16" = "Canada",
  "17" = "United Kingdom",
  "18" = "Netherlands",
  "19" = "Belgium",
  "20" = "France",
  "21" = "Germany",
  "22" = "Switzerland",
  "23" = "Austria",
  "24" = "Czech Republic",
  "25" = "Hungary",
  "26" = "Italy",
  "27" = "Greece",
  "28" = "Spain",
  "29" = "Australia",
  "30" = "New Zealand",
  "31" = "Palau",
  "32" = "South Africa",
  "60" = "Other Asia",
  "61" = "Other Americas",
  "62" = "Other Europe",
  "63" = "Other Oceania",
  "64" = "Other Africa",
  "65" = "Other"
)

library(dplyr)
library(ggplot2)
library(scales)

data_plot <- data_new %>%
  mutate(
    
    # 出國總花費文字
    travel_cost = case_when(
      vq29 == 1 ~ "Below NT$22,500",
      vq29 == 2 ~ "NT$22,500–55,000",
      vq29 == 3 ~ "NT$55,000–105,000",
      vq29 == 4 ~ "NT$105,000–145,000",
      vq29 == 5 ~ "Above NT$145,000",
      TRUE ~ NA_character_
    ),
    
    # 小提琴圖用的數值
    travel_cost_mid = case_when(
      vq29 == 1 ~ 11250,
      vq29 == 2 ~ 38750,
      vq29 == 3 ~ 80000,
      vq29 == 4 ~ 125000,
      vq29 == 5 ~ 160000,
      TRUE ~ NA_real_
    ),
    
    # 年收入分組
    annual_income_group = case_when(
      vb5 == 1 ~ "No Income",
      vb5 == 2 ~ "Below NT$120K",
      vb5 == 3 ~ "NT$120K–180K",
      vb5 == 4 ~ "NT$180K–240K",
      vb5 == 5 ~ "NT$240K–360K",
      vb5 == 6 ~ "NT$360K–480K",
      vb5 == 7 ~ "NT$480K–600K",
      vb5 == 8 ~ "NT$600K–840K",
      vb5 == 9 ~ "NT$840K–1.2M",
      vb5 == 10 ~ "Above NT$1.2M",
      TRUE ~ NA_character_
    ),
    
    annual_income_group = factor(
      annual_income_group,
      levels = c(
        "Above NT$1.2M",
        "NT$840K–1.2M",
        "NT$600K–840K",
        "NT$480K–600K",
        "NT$360K–480K",
        "NT$240K–360K",
        "NT$180K–240K",
        "NT$120K–180K",
        "Below NT$120K",
        "No Income"
      )
    )
  )

attr(data_new$vq29, "label") <- "Overseas Travel Expenditure"
attr(data_new$vb5, "label") <- "Average Annual Income per Person"

# =========================
# Figure 1: Violin plot
# vq29 Overseas Travel Expenditure / vb5 Annual Income
# =========================

ggplot(
  data_plot %>%
    filter(!is.na(travel_cost_mid), !is.na(annual_income_group)),
  aes(
    x = annual_income_group,
    y = travel_cost_mid
  )
) +
  geom_violin(trim = FALSE) +
  geom_boxplot(width = 0.12, outlier.shape = NA) +
  scale_y_continuous(labels = comma) +
  labs(
    title = "Overseas Travel Expenditure by Annual Income",
    x = "Annual Income per Person",
    y = "Estimated Overseas Travel Expenditure (NTD)"
  ) +
  theme_minimal() +
  theme(
    axis.text.x = element_text(angle = 45, hjust = 1)
  )

# =========================
# Figure 2: Pie chart
# Travel expenditure distribution by annual income
# =========================

# =========================
# Pie chart
# Overseas Travel Expenditure by Annual Income
# =========================

library(dplyr)
library(ggplot2)
library(scales)

# 1. Prepare data for pie chart
pie_data <- data_plot %>%
  filter(
    !is.na(travel_cost),
    !is.na(annual_income_group),
    travel_cost != "Unknown"
  ) %>%
  mutate(
    # Income order: high to low
    annual_income_group = factor(
      annual_income_group,
      levels = c(
        "Above NT$1.2M",
        "NT$840K–1.2M",
        "NT$600K–840K",
        "NT$480K–600K",
        "NT$360K–480K",
        "NT$240K–360K",
        "NT$180K–240K",
        "NT$120K–180K",
        "Below NT$120K",
        "No Income"
      )
    ),
    
    # Expenditure order: high to low
    travel_cost = factor(
      travel_cost,
      levels = c(
        "Above NT$145,000",
        "NT$105,000–145,000",
        "NT$55,000–105,000",
        "NT$22,500–55,000",
        "Below NT$22,500"
      )
    )
  ) %>%
  count(annual_income_group, travel_cost) %>%
  group_by(annual_income_group) %>%
  mutate(
    percent = n / sum(n),
    label = percent(percent, accuracy = 0.1)
  ) %>%
  ungroup()

# 2. Draw pie charts
ggplot(
  pie_data,
  aes(
    x = "",
    y = percent,
    fill = travel_cost
  )
) +
  geom_col(width = 1) +
  coord_polar(theta = "y") +
  facet_wrap(~ annual_income_group) +
  labs(
    title = "Distribution of Overseas Travel Expenditure by Annual Income",
    fill = "Travel Expenditure"
  ) +
  theme_void()