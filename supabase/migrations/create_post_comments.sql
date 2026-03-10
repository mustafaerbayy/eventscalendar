-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reply_to_comment_id UUID REFERENCES public.post_comments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read comments
CREATE POLICY "Anyone can read comments" ON public.post_comments
    FOR SELECT USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "Users can insert own comments" ON public.post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments" ON public.post_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.post_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Post Reactions (emoji reactions on posts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions" ON public.post_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own reactions" ON public.post_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON public.post_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Comment Likes
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL DEFAULT '❤️',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comment likes" ON public.comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own comment likes" ON public.comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes" ON public.comment_likes
    FOR DELETE USING (auth.uid() = user_id);
