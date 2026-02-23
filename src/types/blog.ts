export type BlogPost = {
  id: number;
  title: {
    KA: string;
    EN: string;
  };
  content: {
    KA: string;
    EN: string;
  };
  cover_image: string;
  cover_image_url?: string;
  published_at: string;
  created_at: string;
};
