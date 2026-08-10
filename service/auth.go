package service

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/model"
	"ers-go/utils"
)

var (
	ErrUserExists    = errors.New("用户名或手机号已被注册")
	ErrBadCredential = errors.New("用户名或密码错误")
	ErrUserDisabled  = errors.New("账号已被禁用")
	ErrTokenInvalid  = errors.New("token 无效或已过期")
)

// AuthService 认证：访客/管理员登录、JWT 签发、Redis 黑名单登出、刷新
type AuthService struct {
	db    *gorm.DB
	cache *cache.RedisCache
	cfg   *config.Config
}

func NewAuthService(db *gorm.DB, rc *cache.RedisCache, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cache: rc, cfg: cfg}
}

// Register 访客注册
func (s *AuthService) Register(username, password, mobile, email string) error {
	var count int64
	if err := s.db.Model(&model.User{}).
		Where("username = ? OR mobile = ?", username, mobile).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrUserExists
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return err
	}
	now := time.Now()
	user := model.User{
		Username: username, Password: hash, Mobile: mobile, Email: email,
		Status: 1, RegisterTime: now, CreateTime: now,
	}
	return s.db.Create(&user).Error
}

// LoginResult 管理员登录/刷新令牌返回体（对齐前端 LoginResult）
type LoginResult struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
	TokenType    string `json:"tokenType"`
}

// UnifiedLoginResult 统一登录返回体（前端登录页读取 token/userId/username/userType）
type UnifiedLoginResult struct {
	Token     string   `json:"token"`
	UserID    uint     `json:"userId"`
	Username  string   `json:"username"`
	UserType  string   `json:"userType"` // super_admin / admin / viewer
	Roles     []string `json:"roles"`
	ExpiresIn int64    `json:"expiresIn"`
}

// UnifiedLogin 统一登录：前端登录页只调 /api/user/login，
// 按"管理员 → 访客"顺序匹配账号，返回带身份的令牌信息供前端区分跳转
func (s *AuthService) UnifiedLogin(username, password, ip string) (*UnifiedLoginResult, error) {
	// 1) 管理员账号
	var admin model.Admin
	if err := s.db.Where("username = ?", username).First(&admin).Error; err == nil {
		if !utils.CheckPassword(admin.Password, password) {
			return nil, ErrBadCredential
		}
		if admin.Status != 1 {
			return nil, ErrUserDisabled
		}
		token, _, err := utils.GenerateAccessToken(admin.AdminID, utils.UserTypeAdmin, s.cfg.JWT.Secret, s.cfg.JWT.AccessExpireHours)
		if err != nil {
			return nil, err
		}
		userType, role := "admin", "管理员"
		if admin.AdminID == 1 {
			userType, role = "super_admin", "超级管理员"
		}
		return &UnifiedLoginResult{
			Token: token, UserID: admin.AdminID, Username: admin.Username,
			UserType: userType, Roles: []string{role},
			ExpiresIn: int64(time.Duration(s.cfg.JWT.AccessExpireHours) * time.Hour / time.Second),
		}, nil
	}
	// 2) 访客账号
	var user model.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, ErrBadCredential
	}
	if !utils.CheckPassword(user.Password, password) {
		return nil, ErrBadCredential
	}
	if user.Status != 1 {
		return nil, ErrUserDisabled
	}
	token, _, err := utils.GenerateAccessToken(user.UserID, utils.UserTypeVisitor, s.cfg.JWT.Secret, s.cfg.JWT.AccessExpireHours)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	s.db.Model(&user).Updates(map[string]any{"last_login_time": now, "last_login_ip": ip})
	return &UnifiedLoginResult{
		Token: token, UserID: user.UserID, Username: user.Username,
		UserType: "viewer", Roles: []string{"普通用户"},
		ExpiresIn: int64(time.Duration(s.cfg.JWT.AccessExpireHours) * time.Hour / time.Second),
	}, nil
}

// VisitorLogin 访客登录，返回用户信息 + 访问令牌
func (s *AuthService) VisitorLogin(username, password, ip string) (*model.User, string, error) {
	var user model.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, "", ErrBadCredential
	}
	if !utils.CheckPassword(user.Password, password) {
		return nil, "", ErrBadCredential
	}
	if user.Status != 1 {
		return nil, "", ErrUserDisabled
	}
	token, _, err := utils.GenerateAccessToken(user.UserID, utils.UserTypeVisitor, s.cfg.JWT.Secret, s.cfg.JWT.AccessExpireHours)
	if err != nil {
		return nil, "", err
	}
	now := time.Now()
	s.db.Model(&user).Updates(map[string]any{"last_login_time": now, "last_login_ip": ip})
	return &user, token, nil
}

// AdminLogin 管理员登录，返回双令牌
func (s *AuthService) AdminLogin(username, password, ip string) (*model.Admin, *LoginResult, error) {
	var admin model.Admin
	if err := s.db.Where("username = ?", username).First(&admin).Error; err != nil {
		return nil, nil, ErrBadCredential
	}
	if !utils.CheckPassword(admin.Password, password) {
		return nil, nil, ErrBadCredential
	}
	if admin.Status != 1 {
		return nil, nil, ErrUserDisabled
	}
	result, err := s.issueToken(admin.AdminID, utils.UserTypeAdmin)
	if err != nil {
		return nil, nil, err
	}
	_ = ip
	return &admin, result, nil
}

func (s *AuthService) issueToken(userID uint, userType string) (*LoginResult, error) {
	access, _, err := utils.GenerateAccessToken(userID, userType, s.cfg.JWT.Secret, s.cfg.JWT.AccessExpireHours)
	if err != nil {
		return nil, err
	}
	refresh, _, err := utils.GenerateRefreshToken(userID, userType, s.cfg.JWT.Secret, s.cfg.JWT.RefreshExpireDays)
	if err != nil {
		return nil, err
	}
	return &LoginResult{
		AccessToken: access, RefreshToken: refresh,
		ExpiresIn: int64(time.Duration(s.cfg.JWT.AccessExpireHours) * time.Hour / time.Second),
		TokenType: "Bearer",
	}, nil
}

// Logout 登出：将 token 加入 Redis 黑名单（TTL=剩余有效期），实现即时失效
func (s *AuthService) Logout(token string) error {
	if token == "" || s.cache == nil {
		return nil
	}
	claims, err := utils.ParseToken(token, s.cfg.JWT.Secret)
	if err != nil {
		return nil
	}
	remaining := time.Until(claims.ExpiresAt.Time)
	if remaining <= 0 {
		return nil
	}
	return s.cache.Set("blacklist:"+token, "1", remaining)
}

// Refresh 用刷新令牌换发新令牌
func (s *AuthService) Refresh(refreshToken string) (*LoginResult, error) {
	claims, err := utils.ParseToken(refreshToken, s.cfg.JWT.Secret)
	if err != nil {
		return nil, ErrTokenInvalid
	}
	if claims.TokenType != utils.TokenTypeRefresh {
		return nil, ErrTokenInvalid
	}
	if s.cache != nil {
		if exists, err := s.cache.Exists("blacklist:" + refreshToken); err == nil && exists {
			return nil, ErrTokenInvalid
		}
	}
	return s.issueToken(claims.UserID, claims.UserType)
}

// Verify 校验访问令牌（供 /sys/verify）
func (s *AuthService) Verify(token string) map[string]any {
	claims, err := utils.ParseToken(token, s.cfg.JWT.Secret)
	if err != nil || claims.TokenType != utils.TokenTypeAccess {
		return map[string]any{"valid": false}
	}
	if s.cache != nil {
		if exists, err := s.cache.Exists("blacklist:" + token); err == nil && exists {
			return map[string]any{"valid": false}
		}
	}
	username := ""
	if claims.UserType == utils.UserTypeVisitor {
		var u model.User
		if s.db.Select("username").First(&u, claims.UserID).Error == nil {
			username = u.Username
		}
	} else {
		var a model.Admin
		if s.db.Select("username").First(&a, claims.UserID).Error == nil {
			username = a.Username
		}
	}
	return map[string]any{
		"valid": true, "userId": fmt.Sprintf("%d", claims.UserID),
		"username": username, "roles": []string{claims.UserType},
		"exp": claims.ExpiresAt.Unix(),
	}
}

// GetVisitor 查询访客（含黑名单状态）
func (s *AuthService) GetVisitor(id uint) (*model.User, error) {
	var u model.User
	if err := s.db.First(&u, id).Error; err != nil {
		return nil, errors.New("用户不存在")
	}
	return &u, nil
}

// UpdateVisitorInfo 修改访客资料
func (s *AuthService) UpdateVisitorInfo(id uint, realName, phone, email string) error {
	return s.db.Model(&model.User{}).Where("user_id = ?", id).Updates(map[string]any{
		"real_name": realName, "mobile": phone, "email": email,
	}).Error
}

// ChangePassword 修改密码：先校验旧密码
func (s *AuthService) ChangePassword(id uint, oldPwd, newPwd string) error {
	var u model.User
	if err := s.db.First(&u, id).Error; err != nil {
		return errors.New("用户不存在")
	}
	if !utils.CheckPassword(u.Password, oldPwd) {
		return errors.New("原密码错误")
	}
	hash, err := utils.HashPassword(newPwd)
	if err != nil {
		return err
	}
	return s.db.Model(&model.User{}).Where("user_id = ?", id).Update("password", hash).Error
}
