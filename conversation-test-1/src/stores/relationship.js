import {defineStore} from 'pinia'
import { ref } from 'vue'

export const useRelationshipStore = defineStore('relationship', ()=>{
        const relationship = ref(0)
        const talkchance = ref(3)
        const askchance = ref(3)
        const asked = ref(false)
        const talked = ref(2)

        return {
            relationship,
            talkchance,
            askchance,  
            asked,
            talked
        }
}
)