function attachCurrentUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.flashError = req.session.flashError || null;
  res.locals.flashSuccess = req.session.flashSuccess || null;

  delete req.session.flashError;
  delete req.session.flashSuccess;

  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flashError = "Please sign in to continue.";
    return res.redirect("/login");
  }

  return next();
}

module.exports = {
  attachCurrentUser,
  requireAuth
};
