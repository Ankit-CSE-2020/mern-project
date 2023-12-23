const passport = require('passport');


exports.isAuth=(req,res,done)=> {

  return passport.authenticate('jwt')

    // if(req.user){
    //   done()
    // }else{
    //   res.sendStatus(401)
    // }
  } 


exports.sanitizerUser=(user)=>{
    return {id:user.id,role:user.role}
}  


exports.cookieExtractor=function (req) {
  let token=null;
  if(req && req.cookies){
    token=req.cookies['jwt'];
  }
  //token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ODNjYmI5MGMxMWM0OGEzZjEzMzBkZSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzAzMTM2NDE0fQ.u417l76kjX5xty9Cp1i_Cb7n7yF7JCCr092ziquyAXs"
  return token;
}