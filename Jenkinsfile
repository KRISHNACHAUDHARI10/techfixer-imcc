pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:18
    command: ["cat"]
    tty: true

  - name: sonar-scanner
    image: sonarsource/sonar-scanner-cli
    command: ["cat"]
    tty: true

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
'''
        }
    }

    environment {
        IMAGE_NAME = "techfixer-imcc"
        SONAR_PROJECT_KEY  = "techfixer"
        SONAR_PROJECT_NAME = "TechFixer"
    }

    stages {

        stage('CHECK') {
            steps {
                echo "IMCC PIPELINE ACTIVE ✔"
            }
        }

        stage('Checkout Code') {
            steps {
                container('node') {
                    git branch: 'main',
                        url: 'https://github.com/KRISHNACHAUDHARI10/techfixer-imcc',
                        credentialsId: '454cc585-35c1-4a0c-93d6-ae7a37bcfb1e'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                container('node') {
                    sh 'npm install'
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                container('sonar-scanner') {
                    withCredentials([string(credentialsId: 'sonar-token-techfixer', variable: 'SONAR_TOKEN')]) {
                        sh """
                            sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.projectName=${SONAR_PROJECT_NAME} \
                              -Dsonar.sources=. \
                              -Dsonar.host.url=http://sonarqube.imcc.com \
                              -Dsonar.login=$SONAR_TOKEN
                        """
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh """
                        sleep 10
                        docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                    """
                }
            }
        }

        stage('Tag + Push Docker Image') {
            steps {
                container('dind') {
                    sh """
                        docker login nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085 -u admin -p Changeme@2025
                        docker tag ${IMAGE_NAME}:${BUILD_NUMBER} nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085/my-repository/${IMAGE_NAME}:${BUILD_NUMBER}
                        docker push nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085/my-repository/${IMAGE_NAME}:${BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Package Artifact (.tar.gz)') {
            steps {
                container('node') {
                    sh "tar czf ${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz ."
                }
            }
        }

        stage('Upload tar.gz to Nexus') {
            steps {
                container('node') {
                    withCredentials([
                        usernamePassword(credentialsId: 'nexus-imcc', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')
                    ]) {
                        sh """
                            curl -v -u $NEXUS_USER:$NEXUS_PASS \
                                --upload-file ${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz \
                                "http://nexus.imcc.com/repository/my-repository/${IMAGE_NAME}/${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz"
                        """
                    }
                }
            }
        }

    }
}
