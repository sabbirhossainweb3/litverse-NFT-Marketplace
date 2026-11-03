import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, Heart, ImagePlus, LogIn, LogOut, MessageCircle,
  MoreHorizontal, Plus, RefreshCw, Send, ShieldAlert, UserPlus, Users, X
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./community.css";

const LITVM_CHAIN_ID = "0x1159"; // 4441
const LITVM_CHAIN = {
  chainId: LITVM_CHAIN_ID,
  chainName: "LitVM LiteForge",
  nativeCurrency: { name: "zkLTC", symbol: "zkLTC", decimals: 18 },
  rpcUrls: ["https://liteforge.rpc.caldera.xyz/http"],
  blockExplorerUrls: ["https://liteforge.explorer.caldera.xyz"],
};
const BUCKET = "community-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CATEGORIES = ["All", "General", "NFT Showcase", "Creator Zone", "Marketplace", "LitVM Ecosystem", "Help"];
const short = (value = "") => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "LitVerse member";
const errorText = (error) => error?.message || "Something went wrong. Please try again.";

export default function Community() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [comments, setComments] = useState({});
  const [category, setCategory] = useState("All");
  const [draft, setDraft] = useState("");
  const [postCategory, setPostCategory] = useState("General");
  const [postImage, setPostImage] = useState(null);
  const [postNftName, setPostNftName] = useState("");
  const [postNftUrl, setPostNftUrl] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Public community feed. Connect a wallet to post, like and comment.");
  const [expandedComments, setExpandedComments] = useState(new Set());

  const userId = session?.user?.id || null;
  const walletAddress = useMemo(() => {
    const identities = session?.user?.identities || [];
    for (const identity of identities) {
      const data = identity?.identity_data || {};
      const candidate = data.address || data.sub || data.wallet_address;
      if (typeof candidate === "string" && candidate.startsWith("0x")) return candidate;
    }
    return session?.user?.user_metadata?.sub || "";
  }, [session]);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return; }
    const { data, error } = await supabase.from("profiles")
      .select("id, wallet_address, username, avatar_url, bio")
      .eq("id", uid).maybeSingle();
    if (error) throw error;
    setProfile(data || null);
    setProfileName(data?.username || "");
    setProfileBio(data?.bio || "");
  }, []);

  const loadFeed = useCallback(async () => {
    const { data, error } = await supabase.from("posts")
      .select("id, user_id, category, content, image_path, nft_name, nft_url, created_at, profiles!posts_user_id_fkey(id, username, wallet_address, avatar_url)")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;

    const postIds = (data || []).map((post) => post.id);
    let likeRows = [];
    let commentRows = [];
    if (postIds.length) {
      const [likeResult, commentResult] = await Promise.all([
        supabase.from("post_likes").select("post_id,user_id").in("post_id", postIds),
        supabase.from("comments")
          .select("id,post_id,user_id,parent_id,content,created_at,profiles!comments_user_id_fkey(id,username,wallet_address,avatar_url)")
          .in("post_id", postIds).order("created_at", { ascending: true }),
      ]);
      if (likeResult.error) throw likeResult.error;
      if (commentResult.error) throw commentResult.error;
      likeRows = likeResult.data || [];
      commentRows = commentResult.data || [];
    }
    const likesByPost = {};
    for (const row of likeRows) likesByPost[row.post_id] = (likesByPost[row.post_id] || 0) + 1;
    const liked = new Set(likeRows.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const commentsByPost = {};
    for (const row of commentRows) {
      (commentsByPost[row.post_id] ||= []).push(row);
    }
    setPosts((data || []).map((post) => ({
      ...post,
      author: post.profiles,
      likeCount: likesByPost[post.id] || 0,
      commentRows: commentsByPost[post.id] || [],
    })));
    setLikes(liked);
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); return; }
    const { data, error } = await supabase.from("notifications")
      .select("id,kind,message,is_read,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    setNotifications(data || []);
  }, [userId]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadFeed().catch((error) => setMessage(errorText(error)));
    if (userId) {
      loadProfile(userId).catch((error) => setMessage(errorText(error)));
      loadNotifications().catch((error) => setMessage(errorText(error)));
    } else {
      setProfile(null);
      setNotifications([]);
    }
  }, [userId, loadFeed, loadProfile, loadNotifications]);

  async function connectWallet() {
    setBusy(true);
    setMessage("Waiting for wallet sign-in…");
    try {
      if (!window.ethereum) throw new Error("MetaMask or another Ethereum wallet was not found.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) throw new Error("Please unlock your wallet and try again.");
      const currentChain = await window.ethereum.request({ method: "eth_chainId" });
      if (currentChain !== LITVM_CHAIN_ID) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: LITVM_CHAIN_ID }] });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({ method: "wallet_addEthereumChain", params: [LITVM_CHAIN] });
          } else {
            throw switchError;
          }
        }
      }
      // Supabase verifies the EIP-4361 message/signature and issues the authenticated session.
      const { error } = await supabase.auth.signInWithWeb3({
        chain: "ethereum",
        statement: "I agree to use LitVerse Community on LitVM LiteForge.",
      });
      if (error) throw error;
      setMessage("Wallet connected. You can now publish and interact without gas fees.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : "Wallet signed out.");
  }

  async function ensureProfile() {
    if (!userId) throw new Error("Connect your wallet first.");
    const address = walletAddress || (await window.ethereum?.request({ method: "eth_accounts" }))?.[0] || "";
    if (!address) throw new Error("Could not read the signed-in wallet address.");
    const { data, error } = await supabase.from("profiles").upsert({
      id: userId,
      wallet_address: address,
      username: profile?.username || short(address),
      bio: profile?.bio || "",
    }, { onConflict: "id" }).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  async function publishPost(event) {
    event.preventDefault();
    if (!draft.trim() && !postImage && !postNftUrl.trim()) {
      setMessage("Write something, attach an image, or add an NFT link.");
      return;
    }
    setBusy(true);
    try {
      const currentProfile = await ensureProfile();
      let imagePath = null;
      if (postImage) {
        if (!postImage.type.startsWith("image/")) throw new Error("Please choose an image file.");
        if (postImage.size > MAX_IMAGE_BYTES) throw new Error("Image must be 5 MB or smaller.");
        const extension = (postImage.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(imagePath, postImage, {
          contentType: postImage.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        category: postCategory,
        content: draft.trim(),
        image_path: imagePath,
        nft_name: postNftName.trim() || null,
        nft_url: postNftUrl.trim() || null,
      });
      if (error) throw error;
      setDraft(""); setPostImage(null); setPostNftName(""); setPostNftUrl("");
      setMessage(`Post published as ${currentProfile.username}.`);
      await loadFeed();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(postId) {
    if (!userId) { setMessage("Connect your wallet to like posts."); return; }
    const wasLiked = likes.has(postId);
    setLikes((old) => { const next = new Set(old); wasLiked ? next.delete(postId) : next.add(postId); return next; });
    setPosts((old) => old.map((post) => post.id === postId ? { ...post, likeCount: Math.max(0, post.likeCount + (wasLiked ? -1 : 1)) } : post));
    const result = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (result.error) {
      setMessage(errorText(result.error));
      await loadFeed();
    }
  }

  async function sendComment(postId, parentId = null) {
    if (!userId) { setMessage("Connect your wallet to comment."); return; }
    const key = `${postId}:${parentId || "root"}`;
    const content = (commentDrafts[key] || "").trim();
    if (!content) return;
    try {
      await ensureProfile();
      const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, parent_id: parentId, content });
      if (error) throw error;
      setCommentDrafts((old) => ({ ...old, [key]: "" }));
      setReplyTo(null);
      await loadFeed();
    } catch (error) { setMessage(errorText(error)); }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const address = walletAddress || (await window.ethereum?.request({ method: "eth_accounts" }))?.[0] || "";
      if (!address) throw new Error("Wallet address not found.");
      const username = profileName.trim();
      if (username.length < 2 || username.length > 32) throw new Error("Username must be 2–32 characters.");
      const { data, error } = await supabase.from("profiles").upsert({
        id: userId, wallet_address: address, username, bio: profileBio.trim(),
      }, { onConflict: "id" }).select().single();
      if (error) throw error;
      setProfile(data); setShowProfile(false); setMessage("Profile updated.");
      await loadFeed();
    } catch (error) { setMessage(errorText(error)); }
  }

  async function followUser(targetId) {
    if (!userId) { setMessage("Connect your wallet to follow creators."); return; }
    if (targetId === userId) return;
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
    if (error && !String(error.code).includes("23505")) setMessage(errorText(error));
    else setMessage("Follow saved.");
  }

  async function reportPost(postId, targetUserId) {
    if (!userId) { setMessage("Connect your wallet to report content."); return; }
    const reason = window.prompt("Why are you reporting this post? (3–500 characters)");
    if (!reason || reason.trim().length < 3) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId, post_id: postId, reported_user_id: targetUserId, reason: reason.trim(),
    });
    setMessage(error ? errorText(error) : "Report submitted for review.");
  }

  async function blockUser(targetId) {
    if (!userId) { setMessage("Connect your wallet to block users."); return; }
    if (targetId === userId || !window.confirm("Block this creator?")) return;
    const { error } = await supabase.from("user_blocks").insert({ blocker_id: userId, blocked_id: targetId });
    setMessage(error ? errorText(error) : "Creator blocked.");
  }

  async function markNotificationRead(id) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", userId);
    if (error) setMessage(errorText(error));
    else setNotifications((old) => old.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }

  async function imageUrl(path) {
    if (!path) return "";
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  const visiblePosts = category === "All" ? posts : posts.filter((post) => post.category === category);

  return (
    <section className="community-shell">
      <div className="community-top">
        <div>
          <div className="community-kicker">LITVERSE SOCIAL</div>
          <h2>Community <span>Space</span></h2>
          <p>Meet creators, share your NFTs and connect with the LitVM ecosystem.</p>
        </div>
        <div className="community-account">
          {session ? (
            <>
              <button className="community-ghost" onClick={() => { setShowNotifications(!showNotifications); loadNotifications().catch((e) => setMessage(errorText(e))); }}>
                <Bell size={16}/> Alerts {notifications.filter((n) => !n.is_read).length ? `(${notifications.filter((n) => !n.is_read).length})` : ""}
              </button>
              <button className="community-ghost" onClick={() => setShowProfile(true)}>My profile</button>
              <button className="community-wallet" onClick={signOut}><LogOut size={15}/> {short(walletAddress)}</button>
            </>
          ) : <button className="community-wallet" disabled={busy} onClick={connectWallet}><LogIn size={16}/> {busy ? "Connecting…" : "Connect wallet"}</button>}
        </div>
      </div>

      <div className="community-message" role="status">{message}</div>

      {showNotifications && session && <div className="community-panel">
        <div className="community-panel-head"><b>Notifications</b><button onClick={() => setShowNotifications(false)}><X size={16}/></button></div>
        {notifications.length === 0 ? <p className="community-muted">No notifications yet.</p> : notifications.map((item) =>
          <button className={`community-notice ${item.is_read ? "read" : ""}`} key={item.id} onClick={() => markNotificationRead(item.id)}>
            <b>{item.kind}</b><span>{item.message || "New community activity"}</span><small>{new Date(item.created_at).toLocaleString()}</small>
          </button>
        )}
      </div>}

      {session && <form className="community-compose" onSubmit={publishPost}>
        <div className="community-compose-head"><div className="community-avatar">{(profile?.username || "L").slice(0,1).toUpperCase()}</div><div><b>Create a post</b><small>Wallet actions are gas-free</small></div></div>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={3000} placeholder="Share an update with the LitVerse community…" />
        {postImage && <div className="community-file">{postImage.name}<button type="button" onClick={() => setPostImage(null)}><X size={14}/></button></div>}
        <div className="community-compose-tools">
          <label className="community-file-button"><ImagePlus size={16}/> Add image<input type="file" accept="image/*" onChange={(e) => setPostImage(e.target.files?.[0] || null)}/></label>
          <select value={postCategory} onChange={(e) => setPostCategory(e.target.value)}>{CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}</select>
          <input className="community-nft-name" value={postNftName} onChange={(e) => setPostNftName(e.target.value)} placeholder="NFT name (optional)"/>
          <input className="community-nft-url" value={postNftUrl} onChange={(e) => setPostNftUrl(e.target.value)} placeholder="NFT / project URL (optional)"/>
          <button className="community-publish" disabled={busy}><Send size={15}/> Publish</button>
        </div>
        <small className="community-hint">Images up to 5 MB. No blockchain transaction or gas fee for social posts.</small>
      </form>}

      <div className="community-feed-head">
        <div><span className="community-kicker">THE FEED</span><h3>Latest discussions</h3></div>
        <button className="community-refresh" onClick={() => loadFeed().catch((e) => setMessage(errorText(e)))}><RefreshCw size={15}/> Refresh</button>
      </div>
      <div className="community-categories">
        {CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
      </div>

      <div className="community-post-list">
        {visiblePosts.length === 0 ? <div className="community-empty"><Users size={30}/><b>No posts here yet</b><span>Be the first to start a conversation.</span></div> :
          visiblePosts.map((post) => {
            const author = post.author || {};
            const postComments = post.commentRows || [];
            const rootComments = postComments.filter((comment) => !comment.parent_id);
            const image = post.image_path ? imageUrl(post.image_path) : Promise.resolve("");
            return <article className="community-post" key={post.id}>
              <div className="community-post-author">
                <div className="community-avatar">{(author.username || "L").slice(0,1).toUpperCase()}</div>
                <div className="community-author-text"><b>{author.username || short(author.wallet_address)}</b><small>{short(author.wallet_address)} · {new Date(post.created_at).toLocaleString()}</small></div>
                <span className="community-category">{post.category}</span>
                <div className="community-more">
                  <button title="Post options"><MoreHorizontal size={18}/></button>
                  <div className="community-more-menu">
                    {session && author.id !== userId && <>
                      <button onClick={() => followUser(author.id)}><UserPlus size={14}/> Follow creator</button>
                      <button onClick={() => blockUser(author.id)}><X size={14}/> Block creator</button>
                    </>}
                    <button onClick={() => reportPost(post.id, author.id)}><ShieldAlert size={14}/> Report post</button>
                  </div>
                </div>
              </div>
              {post.content && <p className="community-post-content">{post.content}</p>}
              {post.image_path && <PostImage path={post.image_path}/>}
              {post.nft_name && <div className="community-nft-card"><span>✦ NFT SHOWCASE</span><b>{post.nft_name}</b>{post.nft_url && <a href={post.nft_url} target="_blank" rel="noreferrer">View NFT / project ↗</a>}</div>}
              <div className="community-post-actions">
                <button className={likes.has(post.id) ? "liked" : ""} onClick={() => toggleLike(post.id)}><Heart size={16} fill={likes.has(post.id) ? "currentColor" : "none"}/> {post.likeCount} Likes</button>
                <button onClick={() => setExpandedComments((old) => { const next = new Set(old); next.has(post.id) ? next.delete(post.id) : next.add(post.id); return next; })}><MessageCircle size={16}/> {postComments.length} Comments</button>
              </div>
              {expandedComments.has(post.id) && <div className="community-comments">
                {rootComments.map((comment) => <div className="community-comment" key={comment.id}>
                  <b>{comment.profiles?.username || short(comment.profiles?.wallet_address)}</b><p>{comment.content}</p>
                  <button className="community-reply-link" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>Reply</button>
                  {postComments.filter((child) => child.parent_id === comment.id).map((child) => <div className="community-reply" key={child.id}><b>{child.profiles?.username || short(child.profiles?.wallet_address)}</b><p>{child.content}</p></div>)}
                  {replyTo === comment.id && <CommentBox value={commentDrafts[`${post.id}:${comment.id}`] || ""} onChange={(value) => setCommentDrafts((old) => ({...old, [`${post.id}:${comment.id}`]: value}))} onSend={() => sendComment(post.id, comment.id)}/>}
                </div>)}
                {session && <CommentBox value={commentDrafts[`${post.id}:root`] || ""} onChange={(value) => setCommentDrafts((old) => ({...old, [`${post.id}:root`]: value}))} onSend={() => sendComment(post.id)}/>}
                {!session && <small className="community-hint">Connect your wallet to comment.</small>}
              </div>}
            </article>;
          })
        }
      </div>

      {showProfile && <div className="community-modal-backdrop" onClick={() => setShowProfile(false)}>
        <form className="community-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveProfile}>
          <button className="community-modal-close" type="button" onClick={() => setShowProfile(false)}><X size={18}/></button>
          <span className="community-kicker">YOUR IDENTITY</span><h3>Edit profile</h3>
          <label>Username<input value={profileName} onChange={(e) => setProfileName(e.target.value)} minLength={2} maxLength={32} required/></label>
          <label>Bio<textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} maxLength={240}/></label>
          <button className="community-publish">Save profile</button>
        </form>
      </div>}
    </section>
  );
}

function CommentBox({ value, onChange, onSend }) {
  return <div className="community-comment-box"><input value={value} maxLength={1200} onChange={(e) => onChange(e.target.value)} placeholder="Write a comment or reply…"/><button onClick={onSend} type="button"><Send size={14}/></button></div>;
}

function PostImage({ path }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setUrl(data.publicUrl);
  }, [path]);
  return url ? <img className="community-post-image" src={url} alt="Community post attachment" loading="lazy"/> : null;
}
