# Label dictionaries

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

# Pie chart

country_long <- data_new %>%
  pivot_longer(
    cols = vq23_1:vq23_10,
    names_to = "country_order",
    values_to = "country_code"
  ) %>%
  filter(!is.na(country_code)) %>%
  mutate(
    purpose = recode(as.character(vq24), !!!vq24_labels),
    country = recode(as.character(country_code), !!!vq23_labels)
  ) %>%
  filter(!is.na(purpose), !is.na(country))

# Example:
# Travelers whose purpose is leisure/vacation
pie_data <- country_long %>%
  filter(purpose == "Leisure / Vacation") %>%
  count(country) %>%
  arrange(desc(n)) %>%
  slice_head(n = 10) %>%
  mutate(
    percent = n / sum(n),
    label = paste0(country, " (", percent(percent, accuracy = 0.1), ")")
  )

ggplot(
  pie_data,
  aes(
    x = "",
    y = n,
    fill = label
  )
) +
  geom_col(width = 1) +
  coord_polar(theta = "y") +
  labs(
    title = "Destination Distribution of Leisure Travelers",
    fill = "Destination"
  ) +
  theme_void()