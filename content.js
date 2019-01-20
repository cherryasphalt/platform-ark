const generateDescription = function(post) {
  var description = '__Post Date__\n' + post.date + '\n\n__Link__\n' + post.post_url;
  if (post.hasOwnProperty('currentPhotoCount') && post.photos.length > 1)
    description += '\n\n__Image ' + post.currentPhotoCount + ' of ' + post.photos.length + '__\n';
  if (post.hasOwnProperty('caption'))
    description += '\n\n__Caption__\n' + post.caption;
  if (post.hasOwnProperty('description'))
    description += '\n\n__Description__\n' + post.description;
  if (post.hasOwnProperty('source'))
    description += '\n\n__Source__\n' + post.source;
  if (post.hasOwnProperty('source_url'))
    description += '\n\n__Source URL__\n' + post.source_url;
  description += '\n\n__Tags__\n' + post.tags.join(', ');
  return description;
};
