pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:

  - name: sonar-scanner
    image: sonarsource/sonar-scanner-cli
    command: ["cat"]
    tty: true

  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["cat"]
    tty: true
    securityContext:
      runAsUser: 0
    env:
    - name: KUBECONFIG
      value: /kube/config
    volumeMounts:
    - name: kubeconfig-secret
      mountPath: /kube/config
      subPath: kubeconfig

  - name: dind
    image: docker:dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    args:
    - "--storage-driver=overlay2"
    volumeMounts:
    - name: docker-config
      mountPath: /etc/docker/daemon.json
      subPath: daemon.json
    - name: workspace-volume
      mountPath: /home/jenkins/agent

  - name: jnlp
    image: jenkins/inbound-agent:3309.v27b_9314fd1a_4-1
    env:
    - name: JENKINS_AGENT_WORKDIR
      value: "/home/jenkins/agent"
    volumeMounts:
    - mountPath: "/home/jenkins/agent"
      name: workspace-volume

  volumes:
  - name: workspace-volume
    emptyDir: {}
  - name: docker-config
    configMap:
      name: docker-daemon-config
  - name: kubeconfig-secret
    secret:
      secretName: kubeconfig-secret
'''
        }
    }

    stages {

        stage('CHECK') {
            steps {
                echo "DEBUG >>> TechFixer Jenkinsfile Active"
            }
        }

        stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh '''
                        sleep 10
                        docker build -t techfixer-server:latest .
                    '''
                }
            }
        }

stage('SonarQube Scan') {
    steps {
        container('sonar-scanner') {
            withCredentials([string(credentialsId: 'sonar-token-techfixer', variable: 'SONAR_TOKEN')]) {
                sh '''
                  sonar-scanner \
                    -Dsonar.projectKey=2401029_techfixer \
                    -Dsonar.host.url=http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000 \
                    -Dsonar.login=$SONAR_TOKEN
                '''
            }
        }
    }
}



        stage('Login to Nexus Registry') {
            steps {
                container('dind') {
                    sh '''
                      docker login nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085 \
                        -u admin -p Changeme@2025
                    '''
                }
            }
    stage('Tag + Push Image') {
    steps {
        container('dind') {
            sh '''
                docker tag techfixer-server:latest \
                  nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085/my-repository/techfixer-server:latest

                docker push \
                  nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085/my-repository/techfixer-server:latest
            '''
        }
    }
}

      stage('Create Namespace + Secrets') {
   steps {
    container('kubectl') {
        withCredentials([
            string(credentialsId: 'mongo-url-2401029', variable: 'MONGO_URL'),
            string(credentialsId: 'session-secret-2401029', variable: 'SESSION_SECRET'),
            string(credentialsId: 'cloud-name-2401029', variable: 'CLOUD_NAME'),
            string(credentialsId: 'cloud-key-2401029', variable: 'CLOUD_KEY'),
            string(credentialsId: 'cloud-secret-2401029', variable: 'CLOUD_SECRET'),
            string(credentialsId: 'stripe-secret-2401029', variable: 'STRIPE_SECRET'),
            string(credentialsId: 'stripe-publish-2401029', variable: 'STRIPE_PUBLISH')
        ]) {

            sh '''
                kubectl get namespace 2401029 || kubectl create namespace 2401029

                kubectl create secret docker-registry nexus-secret \
                  --docker-server=nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085 \
                  --docker-username=admin \
                  --docker-password=Changeme@2025 \
                  --namespace=2401029 || true

                kubectl create secret generic server-secret \
                  --from-literal=MONGO_URL="$MONGO_URL" \
                  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
                  --from-literal=CLOUDINARY_CLOUD_NAME="$CLOUD_NAME" \
                  --from-literal=CLOUDINARY_API_KEY="$CLOUD_KEY" \
                  --from-literal=CLOUDINARY_API_SECRET="$CLOUD_SECRET" \
                  --from-literal=STRIPE_SECRET_KEY="$STRIPE_SECRET" \
                  --from-literal=STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISH" \
                  -n 2401029 || true
            '''
        }
    }
}

}


        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    dir('k8s-deployment') {
                        sh '''
                            kubectl apply -f deployment.yaml
                            kubectl get pods -n KRISHNA
                        '''
                    }
                }
            }
        }
    }
}
}