-- (Removed sample game inserts)

-- Sample inserts for videos
INSERT INTO public.videos (title, video_id, embed, thumbnail, metadata) VALUES
('TERE ISHQ – Teaser', 'LixDSK0BRFs', 'https://www.youtube.com/embed/LixDSK0BRFs', '/assets/img/tere_ishq_thumb.jpg', '{"genre":"music"}'::jsonb),
('Cooking Quick Tips', 'abcd1234efg', 'https://www.youtube.com/embed/abcd1234efg', '/assets/img/cooking_thumb.jpg', '{"category":"food"}'::jsonb);

-- Sample inserts for stories
INSERT INTO public.stories (title, slug, body, excerpt, metadata) VALUES
('The Little Purple House', 'little-purple-house', 'Once upon a time...', 'A cozy short tale', '{"reading_time":3}'::jsonb),
('Rainy Day Thoughts', 'rainy-day-thoughts', 'Today it rained and...', 'A reflective piece', '{"topic":"life"}'::jsonb);
