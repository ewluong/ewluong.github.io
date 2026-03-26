# Ames Housing Price Prediction
This repository contains a machine learning project that predicts housing prices in Ames, Iowa, using a dataset available on Kaggle. The project demonstrates data preprocessing, feature engineering, model stacking, and hyperparameter tuning to achieve a high-performing prediction model.

## Dataset
The dataset consists of 79 explanatory variables describing almost every aspect of residential homes in Ames, Iowa. The goal is to predict the 'SalePrice' of each house based on these features. The dataset is split into train_data and test_data, which are used for model training and submission purposes, respectively.

## Project Structure
The project follows these main steps:

## Data preprocessing and feature engineering
Model stacking
Hyperparameter tuning with randomized search
Model evaluation using RMSE and R^2 scores
Data Preprocessing and Feature Engineering
Data preprocessing includes handling missing values, scaling numerical features, and encoding categorical features. Additionally, three new features are engineered to improve model performance:

TotalSF: Sum of the total square footage of the basement, first floor, and second floor
Bathrooms: Total number of full and half bathrooms
YearAverage: Average of the built year and the remodeling year
Model Stacking
Model stacking is an ensemble learning technique that combines predictions from multiple base models to improve the overall performance. In this project, we use five base models:

LightGBM (LGBM)
XGBoost (XGB)
Gradient Boosting Regressor (GBR)
Random Forest Regressor (RFR)
CatBoost Regressor
The predictions from these models are combined using a RidgeCV final estimator.

## Hyperparameter Tuning
We use randomized search with 5-fold cross-validation to find the optimal hyperparameters for each base model and the final estimator. The best-performing pipeline is then used for further analysis.

## Model Evaluation
The model's performance is evaluated on the validation set using root mean squared error (RMSE) and R^2 score. The achieved validation RMSE is 0.1281, and the R^2 score is 0.9120, indicating a high-performing prediction model.
