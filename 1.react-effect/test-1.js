let person = {
    name: 'jw',
    get aliasName() {
        console.log(this)
        return '**' + this.name + '**'; // this -> person
    },
    set aliasName(val) {

        this.name = val
    }
}

let proxyPerson = new Proxy(person, {
    get(target, key, receiver) {
        console.log('取值', key)
        return Reflect.get(target, key, receiver); // call

        //return target[key];// target是person person.aliasName
    }
})

// 在获取aliasName的时候 也希望让name属性也会触发get
proxyPerson.aliasName; // 假如说我在页面中使用了aliasName , 会有aliasName对应了页面，但是没有创造name和页面的关系


