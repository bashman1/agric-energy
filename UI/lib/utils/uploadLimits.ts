// Upload limits shared by every form that takes files. The API enforces
// the same numbers (MediaController `max:10240`, `gallery` `max:10` on
// projects and posts) — change them together.

/** Largest file the media endpoint accepts, in megabytes. */
export const MAX_UPLOAD_MB = 10;

/** Most images a project or story gallery may hold. */
export const MAX_GALLERY_IMAGES = 10;
