import  * as Respone from './resp_func'

export default class DataBase {

    /**
     * 构造函数中引用mysql模块，并且创建连接
     */
    constructor() {
        //测试mysql
        var mysql = require('mysql');  //调用MySQL模块
        //创建一个connection
        this.connection = mysql.createConnection({
            host: '127.0.0.1',       //主机
            user: 'root',               //MySQL认证用户名
            password: 'root',        //MySQL认证用户密码
            port: '3306',                   //端口号
            database: 'keep2iron'
        });

        this.connect();
    }

    /**
     * 连接mysql
     */
    connect() {
        //创建一个connection
        this.connection.connect(function (err) {
            if (err) {
                console.log('[query] - :' + err);
                return;
            }
            console.log('[connection connect]  succeed!');
        });
    }

    queryAppList() {
        return new Promise((resolve, reject) => {
            this.connection.query('SELECT * FROM tbl_app', function (err, rows, fields) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows);
            });
        });
    }

    queryAppVersion(id, type) {
        var params = [id, type];
        return new Promise((resolve, reject) => {
            this.connection.query('SELECT version,path FROM tbl_apk_file WHERE id = ? AND type = ?', params, function (err, rows, fields) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows);
            });
        });
    }

    /**
     * 获取数据库中的维护的app
     */
    getApp(type) {
        return new Promise((resolve, reject) => {
            var _type = type;
            this.queryAppList()
                .then(result => {
                    var appList = [];
                    var queryPromise = [];
                    var _this = this;

                    for (var i = 0; i < result.length; i++) {
                        let data = result[i];
                        let promiseArray = [];


                        if ('local' == type) {
                            promiseArray = [_this.queryAppVersion.call(_this, result[i].id, type)];
                        } else if ('releaseDebug' == type) {
                            promiseArray = [_this.queryAppVersion.call(_this, result[i].id, type)];
                        } else if ('release' == type) {
                            promiseArray = [_this.queryAppVersion.call(_this, result[i].id, type)];
                        } else{
                            promiseArray = [_this.queryAppVersion.call(_this, result[i].id, 'local'),
                                _this.queryAppVersion.call(_this, result[i].id, 'releaseDebug'),
                                _this.queryAppVersion.call(_this, result[i].id, 'release')];
                        }

                        queryPromise.push(Promise.all([
                            _this.queryAppVersion.call(_this, result[i].id, 'local'),
                            _this.queryAppVersion.call(_this, result[i].id, 'releaseDebug'),
                            _this.queryAppVersion.call(_this, result[i].id, 'release')
                        ]).then(([localVersion, releaseDebugVersion, releaseVersion]) => {
                            let app = new Object();
                            app.id = data.id;
                            app.name = data.name;
                            app.icon_url = data.icon_url;
                            if('local' == _type) {
                                app.localVersion = localVersion[0].version;
                                app.localPath = localVersion[0].path;
                            } else if('releaseDebug' == _type) {
                                app.releaseDebugVersion = releaseDebugVersion[0].version;
                                app.releaseDebugPath = releaseDebugVersion[0].path;
                            } else if('release' == _type) {
                                app.releaseVersion = releaseVersion[0].version;
                                app.releasePath = releaseVersion[0].path;
                            }else{
                                app.localVersion = localVersion[0].version;
                                app.localPath = localVersion[0].path;

                                app.releaseDebugVersion = releaseDebugVersion[0].version;
                                app.releaseDebugPath = releaseDebugVersion[0].path;

                                app.releaseVersion = releaseVersion[0].version;
                                app.releasePath = releaseVersion[0].path;
                            }

                            appList.push(app);
                        }));
                    }

                    Promise.all(queryPromise)
                        .then(() => {
                            resolve(appList);
                        });
                }).catch(err => reject(err));
        });
    }


    insertAppInfo(params) {
        return new Promise((resolve, reject) => {
            this.connection.query('INSERT INTO tbl_app(id,name,icon_url) values(?,?,?)', params, function (err, result) {
                if (err) reject(err);

                console.log("update : " + result);
                resolve(result);
            })
        });
    }

    insertAppVersion(params) {
        return new Promise((resolve, reject) => {
            this.connection.query('INSERT INTO tbl_apk_file(id,type,path,version) values(?,?,?,?)', params, function (err, result) {
                if (err) reject(err);

                console.log("update : " + result);
                resolve(result);
            })
        });
    }

    updateAppVersion(id, type, path, version) {
        var params = [path, version, id, type];
        return new Promise((resolve, reject) => {
            this.connection.query('update tbl_apk_file set path = ?,version = ? where id = ? and type = ?', params, function (err, result) {
                if (err) reject(err);

                console.log("update : " + result);
                resolve(result);
            })
        });
    }

    insertApp(id, name, icon_url, version_name) {
        var appInfo = [id, name, icon_url, version_name];
        return this.insertAppInfo(appInfo)
            .then((data) => this.insertAppVersion([id, 'local', '', version_name]))
            .then((data) => this.insertAppVersion([id, 'releaseDebug', '', version_name]))
            .then((data) => this.insertAppVersion([id, 'release', '', version_name]));
    }

    /**
     * 执行关闭当前连接对象
     */
    close() {
        //关闭connection
        this.connection.end(function (err) {
            if (err) {
                return;
            }
            console.log('[connection end] succeed!');
        });
    }
}