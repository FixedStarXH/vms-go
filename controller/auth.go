package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"ers-go/middleware"
	"ers-go/utils"
)

// AuthController 认证相关接口
type AuthController struct {
	deps *Deps
}

func NewAuthController(deps *Deps) *AuthController { return &AuthController{deps: deps} }

// Register 访客注册
// POST /api/user/register  body: {username,password,confirmPassword,mobile,email,gender,uuid,captcha}
func (h *AuthController) Register(c *gin.Context) {
	var req struct {
		Username        string `json:"username" binding:"required"`
		Password        string `json:"password" binding:"required,min=6"`
		ConfirmPassword string `json:"confirmPassword"`
		Mobile          string `json:"mobile"`
		Email           string `json:"email"`
		Gender          int    `json:"gender"`
		UUID            string `json:"uuid"`
		Captcha         string `json:"captcha"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误："+err.Error())
		return
	}
	if !h.deps.Captcha.Verify(req.UUID, req.Captcha) {
		utils.Fail(c, "验证码错误或已过期")
		return
	}
	if req.ConfirmPassword != "" && req.ConfirmPassword != req.Password {
		utils.Fail(c, "两次输入的密码不一致")
		return
	}
	if err := h.deps.Auth.Register(req.Username, req.Password, req.Mobile, req.Email); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "注册成功", nil)
}

// Captcha 获取图形验证码
// GET /api/captcha  → 顶层返回 {uuid, captchaImage}（前端 ImageCaptcha 直接读顶层字段）
func (h *AuthController) Captcha(c *gin.Context) {
	uuid, b64, err := h.deps.Captcha.Generate()
	if err != nil {
		utils.Fail(c, "验证码生成失败")
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "success", "uuid": uuid, "captchaImage": b64})
}

// VisitorLogin 统一登录（管理员/访客账号均可登录）
// POST /api/user/login  body: {username,password,uuid,captcha}
func (h *AuthController) VisitorLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		UUID     string `json:"uuid"`
		Captcha  string `json:"captcha"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if !h.deps.Captcha.Verify(req.UUID, req.Captcha) {
		utils.Fail(c, "验证码错误或已过期")
		return
	}
	result, err := h.deps.Auth.UnifiedLogin(req.Username, req.Password, c.ClientIP())
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, result)
}

// AdminLogin 管理员登录（双令牌）
// POST /sys/login
func (h *AuthController) AdminLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	admin, result, err := h.deps.Auth.AdminLogin(req.Username, req.Password, c.ClientIP())
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, gin.H{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"expiresIn":    result.ExpiresIn,
		"tokenType":    result.TokenType,
		"admin": gin.H{
			"adminId": admin.AdminID, "username": admin.Username,
			"realName": admin.RealName, "phone": admin.Phone,
		},
	})
}

// Logout 登出（将 token 加入 Redis 黑名单）
// POST /api/user/logout | POST /sys/logout
func (h *AuthController) Logout(c *gin.Context) {
	token := middleware.ExtractToken(c)
	if err := h.deps.Auth.Logout(token); err != nil {
		utils.Fail(c, "登出失败："+err.Error())
		return
	}
	utils.OKMsg(c, "已退出登录", nil)
}

// Refresh 刷新令牌
// POST /sys/refresh
func (h *AuthController) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	result, err := h.deps.Auth.Refresh(req.RefreshToken)
	if err != nil {
		utils.Unauthorized(c)
		return
	}
	utils.OK(c, result)
}

// Verify 校验 token
// GET /sys/verify
func (h *AuthController) Verify(c *gin.Context) {
	token := middleware.ExtractToken(c)
	if token == "" {
		utils.OK(c, gin.H{"valid": false})
		return
	}
	utils.OK(c, h.deps.Auth.Verify(token))
}
