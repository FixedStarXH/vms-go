package router

import (
	"github.com/gin-gonic/gin"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/controller"
	"ers-go/middleware"
)

// Setup 注册全部路由
func Setup(r *gin.Engine, deps *controller.Deps, rc *cache.RedisCache, cfg *config.Config) {
	r.Use(gin.Logger(), gin.Recovery(), middleware.CORS())

	auth := controller.NewAuthController(deps)
	user := controller.NewUserController(deps)
	app := controller.NewApplicationController(deps)
	admin := controller.NewAdminController(deps)
	rec := controller.NewRecordController(deps)
	mgr := controller.NewManagerController(deps)

	jwt := middleware.JWTAuth(rc, cfg.JWT.Secret)

	// 访客端
	api := r.Group("/api")
	{
		api.GET("/captcha", auth.Captcha)

		userAuth := api.Group("/user")
		userAuth.POST("/register", auth.Register)
		userAuth.POST("/login", auth.VisitorLogin)
		userAuth.POST("/logout", jwt, auth.Logout)
		userAuth.GET("/info", jwt, user.Info)
		userAuth.PUT("/update", jwt, user.Update)
		userAuth.POST("/update", jwt, user.Update) // 兼容旧前端 POST
		userAuth.PUT("/password", jwt, user.Password)
		userAuth.POST("/password", jwt, user.Password) // 兼容旧前端 POST
		userAuth.GET("/dashboard", jwt, user.Dashboard)
		userAuth.GET("/calendar", jwt, user.Calendar)

		applications := api.Group("/application", jwt)
		applications.POST("/submit", app.Submit)
		applications.GET("/list", app.MyList)
		applications.GET("/detail/:id", app.Detail)
		applications.GET("/timeline/:id", app.Timeline)
		applications.PUT("/cancel/:id", app.Cancel)
	}

	// 统一认证
	sys := r.Group("/sys")
	{
		sys.POST("/login", auth.AdminLogin)
		sys.POST("/logout", jwt, auth.Logout)
		sys.POST("/refresh", auth.Refresh)
		sys.GET("/verify", jwt, auth.Verify)
		sys.POST("/password", jwt, mgr.SysPassword) // 管理员改自己密码
	}

	// 管理端（需管理员权限）
	adminGroup := r.Group("/admin", jwt, middleware.RequireAdmin)
	{
		applications := adminGroup.Group("/application")
		applications.GET("/list", admin.AppList)
		applications.GET("/detail/:id", admin.AppDetail)
		applications.PUT("/approve/:id", admin.Approve)
		applications.GET("/approve/:id", admin.Approve) // 兼容旧前端 GET
		applications.PUT("/reject/:id", admin.Reject)
		applications.PUT("/batch-approve", admin.BatchApprove)
		applications.PUT("/batch-reject", admin.BatchReject)
		applications.DELETE("/delete/:id", admin.Delete)
		applications.GET("/export", admin.Export)

		adminGroup.GET("/monitor/today-overview", admin.TodayOverview)

		visitors := adminGroup.Group("/visitor")
		visitors.GET("/list", admin.VisitorList)
		visitors.PUT("/blacklist", admin.Blacklist)

		records := adminGroup.Group("/record")
		records.GET("/list", rec.List)
		records.POST("/verify", rec.Verify)

		// 访客账号 / 管理员账号
		adminGroup.GET("/user/list", mgr.UserList)
		adminGroup.POST("/user/delete", mgr.UserDelete)
		adminGroup.PUT("/manager/blacklist", mgr.Blacklist)
		adminGroup.GET("/manager/list", mgr.ManagerList)
		adminGroup.POST("/manager/add", mgr.ManagerAdd)
		adminGroup.DELETE("/manager/delete/:id", mgr.ManagerDelete)
	}

	// 二维码图片静态资源
	r.Static("/uploads", cfg.App.QRDir)
}
