import type { Dictionary } from "../i18n-core";

// Public profile page wording. Names, bios and field values stay original user content.
export const profileEnglish = {
  "profile.tab.posts": "Posts", "profile.tab.videos": "Videos", "profile.tab.photos": "Photos",
  "profile.changeName": "Change name", "profile.enterName": "Enter your name",
  "profile.back": "Back", "profile.editCover": "Edit cover photo",
  "profile.changeAvatar": "Change profile photo", "profile.joined": "Joined {date}",
  "profile.joinedRecently": "Recently", "profile.about": "About",
  "profile.follow": "Follow", "profile.following": "Following", "profile.message": "Message",
  "profile.sendMessage": "Send message", "profile.followers": "Followers",
  "profile.followingTitle": "Following", "profile.likes": "Likes",
  "profile.noFollowers": "No followers yet.", "profile.followBack": "Follow back",
  "profile.hideFollowing": "Hide following", "profile.followingHidden": "Following list is hidden.",
  "profile.notFollowing": "Not following anyone yet.", "profile.emptyTab": "No {tab} yet.",
  "profile.userFallback": "User", "profile.notFound": "User not found.",
  "profile.backHome": "Back home", "profile.postAlt": "Post", "profile.videoThumbAlt": "Video thumbnail",
  "profile.selectImage": "Please select an image.", "profile.checkingPhoto": "Checking photo…",
  "profile.coverRejected": "Cover photo rejected by our safety filter ({reason}). Nude or sexually suggestive images are not allowed.",
  "profile.avatarRejected": "Profile photo rejected by our safety filter ({reason}). Nude or sexually suggestive images are not allowed.",
  "profile.coverUpdated": "Cover photo updated!", "profile.coverFailed": "Cover photo upload failed.",
  "profile.avatarUpdated": "Profile photo updated!", "profile.avatarFailed": "Profile photo upload failed.",
  "profile.loadFollowersFailed": "Couldn't load followers.", "profile.loadFollowingFailed": "Couldn't load following.",
  "profile.unfollowFailed": "Couldn't unfollow. Please try again.",
  "profile.followFailed": "Couldn't follow. Please try again.",
  "profile.followBackFailed": "Couldn't follow back. Please try again.",
  "profile.unfollowed": "Unfollowed", "profile.followingToast": "Following",
  "profile.hideFollowingFailed": "Couldn't save this setting. Please try again.",
} satisfies Dictionary;
