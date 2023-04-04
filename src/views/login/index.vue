<template lang=''>
	<div class="container">
		<div class="login">
			<n-form ref="formRef" :model="formValue" :label-width="80" :rules="rules">
				<n-form-item label="账号" path="account">
					<n-input v-model:value="formValue.account" placeholder="输入账号" />
				</n-form-item>
				<n-form-item label="密码" path="password">
					<n-input type="password" v-model:value="formValue.password" placeholder="输入密码" />
				</n-form-item>
				<n-form-item>
					<n-button attr-type="button" @click="login" :loading="loading1">
						登录
					</n-button>
				</n-form-item>
			</n-form>
		</div>
		<div class="registry">
			<div>
				<n-button :loading="loading2" @click="registry">点击生成账号密码，请妥善保管好您的账号密码</n-button>
			</div>
			<br>
			<div>
				<span>
					账号：{{registryInfo.account}}
				</span>
				<br>
				<br>
				<span>
					密码：{{registryInfo.password}}
				</span>
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
	import {
		useRouter
	} from 'vue-router'

	import {
		NButton,
		NInput,
		NForm,
		NFormItem,
		Message,
		useMessage
	} from 'naive-ui'

	import {
		ref
	} from 'vue';
	import {
		fetchLogin,
		fetchRegistry
	} from "@/api"
	const router = useRouter()

	const ms = useMessage();
	const formValue = ref({
		account: "",
		password: ""
	});
	const formRef = ref();
	const rules = ref({
		account: {
			required: true,
			message: '请输入账号',
			trigger: 'blur'
		},
		password: {
			required: true,
			message: '请输入密码',
			trigger: ['input', 'blur']
		}

	});
	const registryInfo = ref({});
	const loading1 = ref(false);
	const loading2 = ref(false);
	async function login(e) {
		e.preventDefault();
		console.log(formRef.value);
		if (formRef.value) {
			formRef.value.validate(async (errors, data) => {
				if (!errors) {
					loading1.value = true;
					setTimeout(() => {
						loading1.value = false;
					}, 5000);
					let res = await fetchLogin(formValue.value);
					loading1.value = false;
					console.log(res);
					if (res) {
						localStorage.setItem("token", res.data.token);
						router.replace({
							path: '/',
						})
					}
				} else {
					ms.error('Invalid')
				}
			})
		}
	}

	async function registry() {
		loading2.value = true;
		setTimeout(() => {
			loading2.value = false;
		}, 5000);
		let res = await fetchRegistry();
		loading2.value = false;
		if (res) {
			console.log(res);
			registryInfo.value = res.data;
		}
	}

</script>
<style lang='css'>
	.container {
		width: 800px;
		margin: 40px auto;
	}

</style>
