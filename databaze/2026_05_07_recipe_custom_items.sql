-- Allow saved recipes to keep custom text ingredients as well as linked foods.
-- Safe to run repeatedly.

ALTER TABLE `recipe_items`
  ADD COLUMN IF NOT EXISTS `custom_name` varchar(255) DEFAULT NULL AFTER `food_id`;

ALTER TABLE `recipe_items`
  MODIFY `food_id` int(11) DEFAULT NULL;
