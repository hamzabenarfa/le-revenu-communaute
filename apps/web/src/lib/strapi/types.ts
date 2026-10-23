/** Response shapes of the community endpoints exposed by apps/cms. */

export type DiscussionType = "question" | "discussion" | "poll";
export type MemberRole = "member" | "redaction" | "moderator";

export interface Person {
  username: string;
  name: string;
  color: string;
  photo: string | null;
  role: MemberRole;
  subscriber: boolean;
  pro: string | null;
  /** Level name, only for members and only where the API computes it. */
  level?: string | null;
}

export interface CategoryRef {
  documentId: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

export interface Space extends CategoryRef {
  description: string | null;
  rubrique: string | null;
  discussionCount: number;
  replyCount: number;
  activeMembers: number;
}

export interface SeoStatus {
  indexed: boolean;
  reason: string;
  checks: Array<[string, boolean]>;
}

export interface DiscussionSummary {
  documentId: string;
  title: string;
  slug: string;
  type: DiscussionType;
  pinned: boolean;
  featured: "none" | "question" | "poll";
  publishedAt: string | null;
  lastActivityAt: string | null;
  author: Person | null;
  category: CategoryRef | null;
  excerpt: string;
  replyCount: number;
  usefulCount: number;
  views: number;
  solved: boolean;
  pollVotes: number | null;
  participants: Person[];
  isNew: boolean;
  seo?: SeoStatus;
}

export interface PollOption {
  label: string;
  votes: number;
}

export interface Reply {
  documentId: string;
  content: string;
  publishedAt: string | null;
  author: Person | null;
  usefulCount: number;
  verified: boolean;
  isSolution: boolean;
  liked: boolean;
  mine: boolean;
}

export interface DiscussionDetail extends DiscussionSummary {
  content: string;
  articleTitle: string | null;
  pollOptions: PollOption[] | null;
  solution: string | null;
  usefulTotal: number;
  replies: Reply[];
  related: DiscussionSummary[];
  viewer: {
    liked: boolean;
    followed: boolean;
    myVote: number | null;
    isAuthor: boolean;
    canSolve: boolean;
    staff: boolean;
  } | null;
}

export type FeaturedPoll = DiscussionSummary & {
  pollOptions: PollOption[];
  myVote: number | null;
};

export interface Featured {
  question: DiscussionSummary | null;
  poll: FeaturedPoll | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export type FeedTab = "new" | "hot" | "unanswered" | "foryou";

export interface Feed {
  data: DiscussionSummary[];
  meta: { tab: FeedTab; unanswered: number; pagination: Pagination };
}

export interface Level {
  index: number;
  name: string;
  min: number;
  next: number | null;
  nextName: string | null;
}

export interface Stats {
  discussions: number;
  polls: number;
  replies: number;
  posts: number;
  comments: number;
  usefulReceived: number;
  solutions: number;
  votes: number;
  visitDays: number;
  streak: number;
  onboarded: boolean;
}

export interface Progress {
  points: number;
  monthPoints: number;
  level: Level;
  badges: string[];
  stats: Stats;
}

export interface Me extends Omit<Person, "level">, Progress {
  email: string;
  bio: string;
  onboarded: boolean;
  streak: number;
  interests: string[];
  interestIds: string[];
  staff: boolean;
  unread: number;
}

export interface PostSummary {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  readTime: number;
  publishedAt: string | null;
  author: Person | null;
  category: CategoryRef | null;
  usefulCount: number;
  commentCount: number;
  views: number;
}

export interface Comment {
  documentId: string;
  content: string;
  publishedAt: string | null;
  author: Person | null;
  usefulCount: number;
  liked: boolean;
  mine: boolean;
}

export interface PostDetail extends PostSummary {
  content: string;
  author:
    | (Person & { bio: string | null; level: string | null; points: number })
    | null;
  liked: boolean;
  comments: Comment[];
  moreFromAuthor: PostSummary[];
}

export interface Profile extends Omit<Person, "level">, Progress {
  bio: string;
  since: string | null;
  streak: number;
  isMe: boolean;
  discussions: DiscussionSummary[];
  posts: PostSummary[];
  replies: Array<{
    content: string;
    publishedAt: string | null;
    discussion: { title: string; slug: string };
    isSolution: boolean;
  }>;
}

export interface MemberCard extends Person {
  bio: string;
  since: string | null;
  level: string;
  replies: number;
  solutions: number;
}

export interface LeaderboardRow {
  person: Person;
  points: number;
  monthPoints: number;
  level: string;
  me: boolean;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export interface Leaderboard {
  data: LeaderboardRow[];
  meta: {
    period: "month" | "all";
    rules: Array<[string, number]>;
    levels: Array<[number, string]>;
    badges: Badge[];
  };
}

export interface CommunityEvent {
  documentId: string;
  title: string;
  host: string;
  startsAt: string;
  category: string | null;
  going: number;
  attending: boolean;
}

export interface Notification {
  documentId: string;
  kind: "reply" | "like" | "mention" | "badge" | "solution" | "level" | "event";
  text: string;
  badge: { code: string; icon: string } | null;
  read: boolean;
  createdAt: string | null;
  actor: Person | null;
  href: string | null;
}

export interface SiteArticle {
  documentId: string;
  kicker: string;
  title: string;
  url: string;
  paid: boolean;
}

export interface Charter {
  title: string;
  intro: string | null;
  rules: Array<[string, string]>;
}

export interface CommunityStats {
  members: number;
  discussions: number;
  replies: number;
  resolvedRate: number;
}

export interface SimilarDiscussion {
  documentId: string;
  title: string;
  slug: string;
  replyCount: number;
  solved: boolean;
}

/** What a write earned: points, new badges, level-up (shown as toasts, as on the prototype). */
export interface Reward {
  points: number;
  reason: string;
  total: number;
  badges: Badge[];
  level: string | null;
}

export interface SessionUser {
  username: string;
}
