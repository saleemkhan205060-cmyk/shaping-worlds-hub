import type { Dictionary } from "../i18n-core";

// Draft Swedish translations for the profile page; staged, not activated.
export const profileSwedish = {
  "profile.tab.posts": "Inlägg", "profile.tab.videos": "Videor", "profile.tab.photos": "Foton",
  "profile.changeName": "Ändra namn", "profile.enterName": "Ange ditt namn",
  "profile.back": "Tillbaka", "profile.editCover": "Redigera omslagsfoto",
  "profile.changeAvatar": "Byt profilfoto", "profile.joined": "Gick med {date}",
  "profile.joinedRecently": "Nyligen", "profile.about": "Om",
  "profile.follow": "Följ", "profile.following": "Följer", "profile.message": "Meddelande",
  "profile.sendMessage": "Skicka meddelande", "profile.followers": "Följare",
  "profile.followingTitle": "Följer", "profile.likes": "Gilla-markeringar",
  "profile.noFollowers": "Inga följare ännu.", "profile.followBack": "Följ tillbaka",
  "profile.hideFollowing": "Dölj följerlistan", "profile.followingHidden": "Följerlistan är dold.",
  "profile.notFollowing": "Följer ingen ännu.", "profile.emptyTab": "Inga {tab} ännu.",
  "profile.userFallback": "Användare", "profile.notFound": "Användaren hittades inte.",
  "profile.backHome": "Tillbaka hem", "profile.postAlt": "Inlägg", "profile.videoThumbAlt": "Videominiatyr",
  "profile.selectImage": "Välj en bild.", "profile.checkingPhoto": "Kontrollerar fotot…",
  "profile.coverRejected": "Omslagsfotot nekades av vårt säkerhetsfilter ({reason}). Nakenbilder eller sexuellt suggestiva bilder är inte tillåtna.",
  "profile.avatarRejected": "Profilfotot nekades av vårt säkerhetsfilter ({reason}). Nakenbilder eller sexuellt suggestiva bilder är inte tillåtna.",
  "profile.coverUpdated": "Omslagsfotot uppdaterades!", "profile.coverFailed": "Omslagsfotot kunde inte laddas upp.",
  "profile.avatarUpdated": "Profilfotot uppdaterades!", "profile.avatarFailed": "Profilfotot kunde inte laddas upp.",
  "profile.loadFollowersFailed": "Kunde inte ladda följare.", "profile.loadFollowingFailed": "Kunde inte ladda följerlistan.",
  "profile.unfollowFailed": "Kunde inte sluta följa. Försök igen.",
  "profile.followFailed": "Kunde inte följa. Försök igen.",
  "profile.followBackFailed": "Kunde inte följa tillbaka. Försök igen.",
  "profile.unfollowed": "Slutade följa", "profile.followingToast": "Följer",
  "profile.hideFollowingFailed": "Inställningen kunde inte sparas. Försök igen.",
} satisfies Dictionary;
