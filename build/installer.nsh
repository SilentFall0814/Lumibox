; Lumibox NSIS 自定义安装脚本
; 在安装开始前清空用户配置目录,确保每次安装都是全新软件
; 用户配置位于 %APPDATA%\Lumibox\(lumibox-config.json 等)
; 注意:库目录中的 .lumibox/db.sqlite 属于用户数据,不由安装程序清理

!macro customInit
  ; 每次安装都清空 %APPDATA%\Lumibox\ 目录
  ; 这样保证用户安装后看到的是全新软件,没有任何旧配置干扰
  ; 用户的实际图片/视频库数据存储在库目录中,不受此操作影响
  SetShellVarContext current
  IfFileExists "$APPDATA\Lumibox\*.*" 0 skipCleanAppData
    DetailPrint "正在清理旧版用户配置..."
    RMDir /r "$APPDATA\Lumibox"
  skipCleanAppData:
!macroend
