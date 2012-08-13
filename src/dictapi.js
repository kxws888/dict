(function (exports) {

    var database = openDatabase('dict', '1.0', 'dict database', 5 * 1024 * 1024);
    database.transaction(function (tx) {
        tx.executeSql('DROP TABLE IF EXISTS dict')
        tx.executeSql('CREATE TABLE IF NOT EXISTS dicty (word text, api text, content text, PRIMARY KEY (word, api))');
    }, function (err) {
        console.log(err)
    });

    var api = {
        powerword: {
            url: 'http://dict-co.iciba.com/api/dictionary.php',
            data: 'w=?',
            method: 'get',
            dataType: 'xml',
            parse: function (res) {
                var xml = res, ret = {tt:[]}, element;
                element = xml.getElementsByTagName('acceptation');
                if (element.length) {
                    $.each(element, function (index, item) {
                        var pos = item.previousSibling.previousSibling;
                        ret.tt.push({
                            pos: (pos.tagName.toLowerCase() === 'pos' || pos.tagName.toLowerCase() === 'fe') ? pos.firstChild.nodeValue : '',
                            acceptation: item.firstChild.nodeValue
                        });
                    });

                    element = xml.getElementsByTagName('ps')[0];
                    ret.ps = element ? element.firstChild.nodeValue : '';

                    element = xml.getElementsByTagName('pron')[0];
                    ret.pron = element ? element.firstChild.nodeValue.trim() : '';

                    return ret;
                }
            }
        },
        bing: {
            url: 'http://dict.bing.com.cn/io.aspx',
            data: 't=dict&ut=default&ulang=ZH-CN&tlang=EN-US&q=?',
            method: 'post',
            dataType: 'text',
            parse: function (res) {
                var ret = {tt:[]}, element;
                res = JSON.parse(res).ROOT;
                if (res.DEF) {
                    ret.ps = res.PROS.PRO ? (res.PROS.PRO.length ? res.PROS.PRO[0].$ : res.PROS.PRO.$) : '';

                    ret.pron = res.AH ? 'http://media.engkoo.com:8129/en-us/' + res.AH.$ + '.mp3' : '';

                    element = res.DEF[0].SENS;
                    if (element) {
                        if (!element.length) {element = [element];}
                        $.each(element, function (index, item) {
                            var t;
                            if (item.SEN.length) {
                                t = [];
                                for (var i = 0; i < item.SEN.length ; i += 1) {
                                    t.push(item.SEN[i].D.$);
                                }
                                t = t.join(',')
                            }
                            else {
                                t = item.SEN.D.$;
                            }

                            ret.tt.push({
                                pos: item.$POS + '.',
                                acceptation: t
                            });
                        });
                        return ret;
                    }
                }
            }
        },
        qqdict: {
            url: 'http://dict.qq.com/dict',
            method: 'get',
            data: 'f=web&q=?',
            dataType: 'text',
            parse: function (res) {
                var ret = {tt: []}, element;
                res = JSON.parse(res);
                if (res.local) {
                    res = res.local[0];
                    ret.ps = res.pho ? res.pho[0] : '';
                    ret.pron = res.sd ? 'http://speech.dict.qq.com/audio/' + res.sd.substring(0, 3).split('').join('/') + '/' + res.sd + '.mp3' : '';
                    element = res.des;
                    if (element) {
                        $.each(element, function (index, item){
                            ret.tt.push({
                                pos: (item.p ? item.p : ''),
                                acceptation: item.d
                            });
                        });
                        return ret;
                    }
                }
            }
        },
        youdao: {
            url: 'http://fanyi.youdao.com/translate?smartresult=dict&smartresult=rule&smartresult=ugc&sessionFrom=http://dict.youdao.com/',
            method: 'post',
            data: 'type=AUTO&doctype=json&xmlVersion=1.4&keyfrom=fanyi.web&ue=UTF-8&typoResult=true&flag=false&i=?',
            dataType: 'text',
            parse: function (res) {
                var ret = {};
                res = JSON.parse(res).translateResult;;
                if (res.length) {
                    var acceptation = '';
                    $.each(res, function (index, item) {
                        acceptation += item[0].tgt;
                    });
                    return {tt: [{pos: '', acceptation: acceptation}]};
                }
            }
        },
        baidu: {
            url: 'http://openapi.baidu.com/public/2.0/bmt/translate',
            method: 'get',
            data: 'from=auto&to=auto&client_id=r1SFkGlNueMFRf0LUj6VpL55&q=?',
            dataType: 'text',
            parse: function (res) {
                res = JSON.parse(res);
                var acceptation = '';
                if (res.trans_result && res.trans_result.length) {
                    $.each(res.trans_result, function (index, item) {
                        acceptation += item.dst;
                    });
                    return {tt: [{pos: '', acceptation: acceptation}]};
                }
            }
        },
        google: {
            url: 'http://translate.google.com/translate_a/t',
            method: 'get',
            data: 'client=t&hl=zh-CN&sl=auto&tl=auto&text=?',
            dataType: 'text',
            parse: function (res) {
                var acceptation = '';
                console.log(res)
                res = res.match(/^\[{3}(.+?)\]{2},,/)[1].split('],[');
                $.each(res, function (index, item){
                    acceptation += item.split(',')[0].slice(1, -1);
                });
                return {tt: [{pos: '', acceptation: acceptation}]};
            }
        }
    };

    exports.Query = Class(api, {

        init: function (args) {

        },

        query: function (options) {
            var self = this,
                word = options.word,
                api = options.api,
                callback = options.callback;

            $.ajax({
                url: self[api].url,
                method: self[api].type,
                data: self[api].data.replace('?', encodeURIComponent(word)),
                dataType: self[api].dataType,
                success: function (response) {
                    var result = self[api].parse(response);
                    if (result) {
                        result.key = word;
                        callback(result);
                    }
                    else {
                        callback({key: word, tt: [{pos: '', acceptation: '查询不到结果'}]});
                    }
                },
                error: function (response) {console.log(response)
                    callback({key: word, tt: [{pos: '', acceptation: '出错了!'}]});
                }
            });
        }

    });
/*



    function Dict(args) {
        args = args || {};
        this.superclass.constructor.call(this, args);
    }

    extend(Dict, Query);

    Dict.prototype.query = function () {
        var self = this;
        database.transaction(function (tx) {
            tx.executeSql('SELECT * FROM dicty WHERE word=? AND api=?', [self.word, self.model], function (tx, result) {
                if (result.rows.length > 0) {
                    self.res = JSON.parse(result.rows.item(0).content);
                    self.load(self.res);
                    self.loadend(self.res);
                }
                else {
                    ajax(self.type, self.api, self.data, proxy(self.ajaxLoad, self), proxy(self.ajaxError, self));
                }
            });
        });
    };

    Dict.prototype.updateDB = function (data) {
        var self = this;
        database.transaction(function (tx) {
            tx.executeSql('INSERT INTO dicty VALUES (?,?,?)', [data.key, self.model , JSON.stringify(data)]);
        }, function (err) {
            console.log(arguments)
            if (err.code === 4) {
                tx.executeSql('DELETE FROM dict', []);
            }
        });
    };

    Dict.prototype.ajaxLoad = function (client) {
        if (this.res.tt.length > 0) {
            this.load(this.res);
            this.updateDB(this.res);
            this.loadend(this.res);
        }
        else {
            this.ajaxError();
        }
    };

    */
})(this);
