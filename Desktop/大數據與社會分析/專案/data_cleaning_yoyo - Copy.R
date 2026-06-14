library(dplyr)
library(stringr)
library(ggplot2)
library(scales)
library(forcats)

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


data_new <- data1_clean

# =========================
# 1. Prepare data
# =========================

q4_data <- data_new %>%
  pivot_longer(
    cols = vq23_1:vq23_6,
    names_to = "destination_order",
    values_to = "vq23"
  ) %>%
  filter(!is.na(vq23), vq23 != 0) %>%
  mutate(
    # 合併旅遊目的：原本五項，後三項合併
    travel_purpose = case_when(
      vq24 == 1 ~ "Leisure / Vacation",
      vq24 == 2 ~ "Business Trip",
      vq24 %in% c(3, 4, 5, 65) ~ "Other Purposes",
      TRUE ~ NA_character_
    ),
    
    # 合併旅遊目的地國家／地區
    destination_group = case_when(
      vq23 == 12 ~ "Japan",
      vq23 == 2 ~ "China",
      vq23 == 13 ~ "South Korea",
      vq23 %in% c(4, 5, 6, 7, 8, 9, 10, 11) ~ "Southeast Asia",
      vq23 %in% c(1, 3) ~ "Hong Kong / Macau",
      vq23 %in% c(15, 16, 61) ~ "Americas",
      vq23 %in% c(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 62) ~ "Europe",
      vq23 %in% c(29, 30, 31, 63) ~ "Oceania",
      vq23 %in% c(14, 60, 64, 65) ~ "Other",
      TRUE ~ "Other"
    )
  ) %>%
  filter(!is.na(travel_purpose), !is.na(destination_group))

# =========================
# 2. Function for pie chart
# =========================

make_destination_pie <- function(purpose_name) {
  
  pie_data <- q4_data %>%
    filter(travel_purpose == purpose_name) %>%
    count(destination_group, sort = TRUE) %>%
    mutate(
      percent = n / sum(n),
      destination_group = fct_reorder(destination_group, n, .desc = TRUE),
      label = paste0(destination_group, "\n", percent(percent, accuracy = 0.1))
    )
  
  ggplot(
    pie_data,
    aes(
      x = "",
      y = n,
      fill = destination_group
    )
  ) +
    geom_col(width = 1) +
    coord_polar(theta = "y") +
    labs(
      title = paste("Destination Country by Travel Purpose:", purpose_name),
      fill = "Destination"
    ) +
    theme_void() +
    theme(
      plot.title = element_text(size = 14, face = "bold"),
      legend.title = element_text(size = 11),
      legend.text = element_text(size = 10)
    )
}

# =========================
# 3. Three pie charts
# =========================

make_destination_pie("Leisure / Vacation")

make_destination_pie("Business Trip")

make_destination_pie("Other Purposes")