# Data preprocessing

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



# Figure
# Violin plot

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


# # =========================
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