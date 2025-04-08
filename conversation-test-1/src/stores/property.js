import {defineStore} from 'pinia'
import { ref } from 'vue'
export const usePropertyStore = defineStore("property",()=>{
    const intelligence = ref(0)
    const strength = ref(0)
    const emotion = ref(0)
    function addProperty(property,value){
        switch(property){
            case "intelligence":
                intelligence.value += value
                break
            case "strength":
                strength.value += value
                break
            case "emotion":
                emotion.value += value
                break
        }
    }
    function removeProperty(property,value){
        switch(property){
            case "intelligence":
                intelligence.value -= value
                break
            case "strength":
                strength.value -= value
                break
            case "emotion":
                emotion.value -= value
                break
        }
    }
    return {
        intelligence,
        strength,
        emotion,
        addProperty,
        removeProperty
    }

})